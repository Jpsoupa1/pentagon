import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { ZodError } from "zod";
import { LIMITE_POR_HORA, LIMITE_TEXTO_PEDIDO } from "@/lib/assistente";
import { DIAS, MESES, addDias, diaDaSemana, hojeLocal, horaLocal } from "@/lib/tempo";
import { db, naTransacao } from "../db";
import {
  assistantActions,
  assistantRuns,
  type FalhaDoAssistente,
  type JanelaConsulta,
} from "../db/schema";
import { Conflito, LimiteExcedido, NaoEncontrado, SemCreditos } from "../erros";
import { obterAjustes } from "../servicos/ajustes";
import { proximosPrazos } from "../servicos/avaliacoes";
import { listarDisciplinas } from "../servicos/disciplinas";
import {
  aplicarCorrecao,
  dadosDoIntervalo,
  esquemas,
  executarExclusao,
  executarFerramenta,
  type Execucao,
  type NomeFerramenta,
} from "./ferramentas";
import { FERRAMENTAS, INSTRUCOES } from "./instrucoes";
import { desfazerAcaoGravada, fotoAtual, obterAcao } from "./registro";

/** Só o que o laço usa da API: facilita trocar por respostas simuladas nos testes. */
export type ClienteClaude = {
  criar(
    params: Anthropic.Beta.MessageCreateParamsNonStreaming,
  ): Promise<Anthropic.Beta.BetaMessage>;
};

export const MODELO_PADRAO = "claude-sonnet-5-5";
export const modeloConfigurado = () => process.env.ANTHROPIC_MODEL?.trim() || MODELO_PADRAO;

/** Teto de tokens por resposta e de idas e voltas por pedido. */
const MAX_TOKENS = 4096;
const MAX_RODADAS = 6;

export function clienteReal(): ClienteClaude {
  const anthropic = new Anthropic({ maxRetries: 1, timeout: 60_000 });
  return { criar: (params) => anthropic.beta.messages.create(params) };
}

// ---------------------------------------------------------------- Contexto

function dataPorExtenso(data: string) {
  const [a, m, d] = data.split("-").map(Number);
  return `${DIAS[diaDaSemana(data)].toLowerCase()}, ${d} de ${MESES[m - 1]} de ${a}`;
}

/** Escapa `<` para que nenhum dado do usuário feche ou abra as marcações do contexto. */
const comoDado = (valor: unknown) => JSON.stringify(valor).replaceAll("<", "\\u003c");

export async function montarContexto(userId: string, texto: string, agora: Date) {
  const { fuso } = await obterAjustes(userId);
  const hoje = hojeLocal(agora, fuso);
  const amanha = addDias(hoje, 1);
  const [doisDias, prazos, disciplinas] = await Promise.all([
    dadosDoIntervalo(userId, hoje, amanha, fuso),
    proximosPrazos(userId, agora, 8),
    listarDisciplinas(userId),
  ]);
  const dados = {
    hoje_e_amanha: doisDias.agenda,
    lembretes_de_hoje_e_amanha: doisDias.lembretes,
    proximos_prazos: prazos.map((p) => ({
      item: `avaliacao:${p.id}`,
      tipo: p.tipo,
      titulo: p.titulo,
      disciplina: p.sigla,
      quando: `${hojeLocal(p.entregaEm, fuso)} ${horaLocal(p.entregaEm, fuso)}`,
    })),
    disciplinas: disciplinas.map((d) => ({
      id: d.id,
      nome: d.nome,
      sigla: d.sigla,
      faltas: d.faltas,
      limite_faltas: d.limiteFaltas,
    })),
  };
  return {
    fuso,
    texto: [
      `Agora: ${dataPorExtenso(hoje)}, ${horaLocal(agora, fuso)} (${fuso}). Hoje = ${hoje}. Amanhã = ${amanha}. Ontem = ${addDias(hoje, -1)}.`,
      `<dados_do_usuario>\n${comoDado(dados)}\n</dados_do_usuario>`,
      `<pedido>\n${texto.replaceAll("<", "‹")}\n</pedido>`,
    ].join("\n\n"),
  };
}

// ---------------------------------------------------------------- Execução

type Resposta = ReturnType<typeof esquemas.responder.parse>;

function mensagemDeFalha(e: unknown): string {
  if (e instanceof ZodError) return "Dados inválidos para essa ação.";
  if (e instanceof NaoEncontrado || e instanceof Conflito) return e.message;
  console.error("Ferramenta do assistente falhou", e);
  return "Erro interno ao executar essa ação.";
}

function semCreditos(e: unknown) {
  return (
    e instanceof Anthropic.APIError &&
    (e.status === 402 ||
      e.type === "billing_error" ||
      (e.status === 400 && /credit balance/i.test(e.message)))
  );
}

async function conferirLimite(userId: string, agora: Date) {
  const [{ total }] = await db()
    .select({ total: sql<number>`count(*)::int` })
    .from(assistantRuns)
    .where(
      and(
        eq(assistantRuns.userId, userId),
        gte(assistantRuns.createdAt, new Date(agora.getTime() - 60 * 60_000)),
      ),
    );
  if (total >= LIMITE_POR_HORA)
    throw new LimiteExcedido(
      `Você chegou ao limite de ${LIMITE_POR_HORA} pedidos por hora. Tente de novo daqui a pouco.`,
    );
}

/**
 * Atende um pedido: chama o Claude com as ferramentas do Pentagon, executa cada ação na mesma
 * transação do seu registro e só aceita o fim pela ferramenta `responder`.
 */
export async function executarAssistente(
  userId: string,
  textoBruto: string,
  opcoes: { cliente?: ClienteClaude; agora?: Date } = {},
) {
  const texto = textoBruto.trim().slice(0, LIMITE_TEXTO_PEDIDO);
  if (!texto) throw new Conflito("Diga ou digite o que você quer fazer.");
  const agora = opcoes.agora ?? new Date();
  const cliente = opcoes.cliente ?? clienteReal();
  const modelo = modeloConfigurado();

  // Todo pedido conta no limite por hora, inclusive os fora do escopo.
  await conferirLimite(userId, agora);
  const [run] = await db()
    .insert(assistantRuns)
    .values({ userId, texto, modelo })
    .returning({ id: assistantRuns.id });

  const contexto = await montarContexto(userId, texto, agora);
  const ex: Execucao = { userId, runId: run.id, fuso: contexto.fuso, agora };
  const mensagens: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: contexto.texto }];
  const tokens = { entrada: 0, saida: 0, cacheEscrita: 0, cacheLeitura: 0 };
  const falhas: FalhaDoAssistente[] = [];
  let resposta: Resposta | null = null;
  let lembrouDeResponder = false;

  try {
    for (let rodada = 0; rodada < MAX_RODADAS && !resposta; rodada++) {
      const msg = await cliente.criar({
        model: modelo,
        max_tokens: MAX_TOKENS,
        // Instruções e ferramentas se repetem em toda chamada: ficam no cache.
        system: [{ type: "text", text: INSTRUCOES, cache_control: { type: "ephemeral" } }],
        tools: FERRAMENTAS,
        tool_choice: { type: "auto" },
        output_config: { effort: "low" },
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        messages: mensagens,
      });
      tokens.entrada += msg.usage.input_tokens;
      tokens.saida += msg.usage.output_tokens;
      tokens.cacheEscrita += msg.usage.cache_creation_input_tokens ?? 0;
      tokens.cacheLeitura += msg.usage.cache_read_input_tokens ?? 0;

      if (msg.stop_reason === "refusal") {
        resposta = { tipo: "fora_do_escopo", resumo: "Recusado pelo modelo." };
        break;
      }
      const chamadas = msg.content.filter(
        (b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use",
      );
      mensagens.push({ role: "assistant", content: msg.content });

      if (!chamadas.length) {
        // Resposta solta, sem `responder`: o servidor não aceita. Pede uma vez e depois desiste.
        if (lembrouDeResponder) break;
        lembrouDeResponder = true;
        mensagens.push({
          role: "user",
          content: "Termine chamando a ferramenta `responder`. Texto solto não é aceito.",
        });
        continue;
      }

      const resultados: Anthropic.Beta.BetaToolResultBlockParam[] = [];
      for (const c of chamadas) {
        if (c.name === "responder") continue;
        if (!(c.name in esquemas)) {
          resultados.push({
            type: "tool_result",
            tool_use_id: c.id,
            content: "Ferramenta inexistente.",
            is_error: true,
          });
          continue;
        }
        try {
          const saida = await naTransacao(() =>
            executarFerramenta(ex, c.name as Exclude<NomeFerramenta, "responder">, c.input),
          );
          resultados.push({ type: "tool_result", tool_use_id: c.id, content: saida.texto });
        } catch (e) {
          const mensagem = mensagemDeFalha(e);
          falhas.push({ ferramenta: c.name, mensagem });
          resultados.push({
            type: "tool_result",
            tool_use_id: c.id,
            content: mensagem,
            is_error: true,
          });
        }
      }

      const fim = chamadas.find((c) => c.name === "responder");
      if (fim) {
        const lido = esquemas.responder.safeParse(fim.input);
        if (lido.success) {
          resposta = lido.data;
          break;
        }
        resultados.push({
          type: "tool_result",
          tool_use_id: fim.id,
          content: "Resposta inválida. Confira tipo, resumo e janela.",
          is_error: true,
        });
      }
      mensagens.push({ role: "user", content: resultados });
    }
  } catch (e) {
    await finalizar(run.id, { tipo: "erro", tokens, falhas });
    if (semCreditos(e)) {
      throw new SemCreditos("O assistente volta quando os créditos renovarem.");
    }
    throw e;
  }

  let tipo: "acoes" | "consulta" | "fora_do_escopo" | "erro" = resposta?.tipo ?? "erro";
  if (tipo === "fora_do_escopo") {
    // Fora do escopo nunca deixa mudança: o que tiver sido feito é desfeito e propostas somem.
    await descartarTudo(userId, run.id);
  }
  let janela: JanelaConsulta | null = null;
  if (tipo === "consulta") {
    janela = resposta?.janela
      ? {
          de: resposta.janela.de,
          ate: [resposta.janela.ate, addDias(resposta.janela.de, 31)].sort()[0],
          horaInicio: resposta.janela.hora_inicio ?? null,
          horaFim: resposta.janela.hora_fim ?? null,
          areas: resposta.janela.areas ?? null,
        }
      : null;
    if (!janela) tipo = "erro";
  }
  if (tipo === "erro" && (await temAcoes(run.id))) tipo = "acoes";

  await finalizar(run.id, {
    tipo,
    tokens,
    falhas,
    resumo: resposta?.resumo ?? null,
    ignorouParte: tipo === "acoes" && !!resposta?.ignorou_parte,
    consulta: janela,
  });
  return { id: run.id, houveMudanca: await temAcoes(run.id, "feita") };
}

async function finalizar(
  runId: string,
  r: {
    tipo: "acoes" | "consulta" | "fora_do_escopo" | "erro";
    tokens: { entrada: number; saida: number; cacheEscrita: number; cacheLeitura: number };
    falhas: FalhaDoAssistente[];
    resumo?: string | null;
    ignorouParte?: boolean;
    consulta?: JanelaConsulta | null;
  },
) {
  await db()
    .update(assistantRuns)
    .set({
      tipo: r.tipo,
      resumo: r.resumo ?? null,
      ignorouParte: r.ignorouParte ?? false,
      consulta: r.consulta ?? null,
      falhas: r.falhas,
      tokensEntrada: r.tokens.entrada,
      tokensSaida: r.tokens.saida,
      tokensCacheEscrita: r.tokens.cacheEscrita,
      tokensCacheLeitura: r.tokens.cacheLeitura,
    })
    .where(eq(assistantRuns.id, runId));
}

async function temAcoes(runId: string, status?: "feita") {
  const [{ total }] = await db()
    .select({ total: sql<number>`count(*)::int` })
    .from(assistantActions)
    .where(
      and(
        eq(assistantActions.runId, runId),
        status
          ? eq(assistantActions.status, status)
          : inArray(assistantActions.status, ["feita", "proposta"]),
      ),
    );
  return total > 0;
}

async function acoesDaExecucao(userId: string, runId: string) {
  return db()
    .select()
    .from(assistantActions)
    .where(and(eq(assistantActions.runId, runId), eq(assistantActions.userId, userId)))
    .orderBy(desc(assistantActions.ordem));
}

async function descartarTudo(userId: string, runId: string) {
  for (const a of await acoesDaExecucao(userId, runId)) {
    if (a.status === "feita") await naTransacao(() => desfazerAcaoGravada(userId, a));
    if (a.status === "proposta")
      await db()
        .update(assistantActions)
        .set({ status: "descartada", atualizadaEm: new Date() })
        .where(eq(assistantActions.id, a.id));
  }
}

// ---------------------------------------------------------------- Pedidos feitos na tela

export async function obterExecucao(userId: string, runId: string) {
  const [r] = await db()
    .select()
    .from(assistantRuns)
    .where(and(eq(assistantRuns.id, runId), eq(assistantRuns.userId, userId)));
  if (!r) throw new NaoEncontrado("Pedido");
  const acoes = await db()
    .select()
    .from(assistantActions)
    .where(eq(assistantActions.runId, runId))
    .orderBy(asc(assistantActions.ordem));
  return { ...r, acoes };
}

/** Desfaz uma ação (ou descarta uma proposta). */
export async function desfazerAcao(userId: string, id: string) {
  return naTransacao(async () => {
    const a = await obterAcao(userId, id);
    if (a.status === "proposta") {
      await db()
        .update(assistantActions)
        .set({ status: "descartada", atualizadaEm: new Date() })
        .where(eq(assistantActions.id, id));
      return;
    }
    if (a.status !== "feita") throw new Conflito("Essa ação já foi desfeita.");
    await desfazerAcaoGravada(userId, a);
  });
}

/** Desfaz a execução inteira na ordem inversa; itens alterados depois ficam como estão, com aviso. */
export async function desfazerExecucao(userId: string, runId: string) {
  await obterExecucao(userId, runId);
  const avisos: string[] = [];
  for (const a of await acoesDaExecucao(userId, runId)) {
    if (a.status !== "feita" && a.status !== "proposta") continue;
    try {
      await desfazerAcao(userId, a.id);
    } catch (e) {
      if (!(e instanceof Conflito)) throw e;
      avisos.push(e.message);
    }
  }
  return { avisos };
}

/** O usuário confirmou uma exclusão proposta. */
export async function confirmarAcao(userId: string, id: string) {
  return naTransacao(async () => {
    const a = await obterAcao(userId, id);
    if (a.status !== "proposta") throw new Conflito("Essa proposta não está mais aberta.");
    const antes = await fotoAtual(userId, a.entidade, a.entidadeId);
    if (a.entidade !== "excecao" && !antes) throw new NaoEncontrado("Item");
    await executarExclusao(userId, a.entidade, a.entidadeId);
    await db()
      .update(assistantActions)
      .set({
        status: "feita",
        antes,
        depois: await fotoAtual(userId, a.entidade, a.entidadeId),
        atualizadaEm: new Date(),
      })
      .where(eq(assistantActions.id, id));
  });
}

/** Conflito: aplica a correção sugerida (`mover`) ou registra que fica como está (`manter`). */
export async function decidirConflito(
  userId: string,
  id: string,
  decisao: "mover" | "manter",
  indice = 0,
) {
  return naTransacao(async () => {
    const a = await obterAcao(userId, id);
    if (a.status !== "feita") throw new Conflito("Essa alteração não está mais valendo.");
    if (a.conflitoDecisao) throw new Conflito("Esse conflito já foi decidido.");
    if (decisao === "mover") {
      const c = a.conflitos[indice];
      if (!c) throw new NaoEncontrado("Conflito");
      const { fuso } = await obterAjustes(userId);
      await aplicarCorrecao({ userId, runId: a.runId, fuso, agora: new Date() }, c);
    }
    await db()
      .update(assistantActions)
      .set({
        conflitoDecisao: decisao === "mover" ? "movido" : "mantido",
        atualizadaEm: new Date(),
      })
      .where(eq(assistantActions.id, id));
  });
}
