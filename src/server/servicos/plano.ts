import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import type { z } from "zod";
import {
  blocosPlano,
  conteudoDoBloco,
  ehDiaUtil,
  blocoAgendado,
  estadoDoItem,
  estudadosNoDia,
  estadoTrilha,
  fechamento,
  gravarEscolha,
  horasGastas,
  horasRestantes,
  itemPorCodigo,
  lerEscolha,
  minutosDoBloco,
  liberadosApos,
  mensagemTentativa,
  opcoesDeTroca,
  progressoTrilha,
  recrutamentoLiberado,
  requisitosNaoMarcados,
  rotulo,
  SUGESTAO_INICIAL,
  tentativaAprovada,
  textoBloco,
  textoLiberacao,
  verificarConclusao,
  verificarDesfazer,
  verificarTroca,
  type BlocoPlano,
  type Catalogo,
  type Conclusao,
  type ItemPlano,
  type Pendente,
} from "@/lib/plano";
import { hojeLocal, segundaDe } from "@/lib/tempo";
import type {
  blocoFeitoPlanoSchema,
  checkPlanoSchema,
  conclusaoPlanoSchema,
  folgaPlanoSchema,
  planoInicioSchema,
  tentativaPlanoSchema,
  trocaPlanoSchema,
} from "@/lib/validacao";
import { db, naTransacao } from "../db";
import {
  planoBlocos,
  planoChecks,
  planoContagens,
  planoFolgas,
  planoHistorico,
  planoProgresso,
  planoTentativas,
  settings,
  users,
} from "../db/schema";
import { Conflito, EntradaInvalida, NaoEncontrado, Proibido } from "../erros";
import { recebeConteudoPessoal } from "../permissao";
import { catalogoDoBanco } from "../plano/catalogo";
import { obterAjustes, type Ajustes } from "./ajustes";

const RECRUTAMENTO = "recrutamento";

// ---------------------------------------------------------------- Contexto e trava

export type Contexto = {
  userId: string;
  agora: Date;
  /** Hoje no fuso do usuário. */
  hoje: string;
  cat: Catalogo;
  ajustes: Ajustes;
  conclusoes: Conclusao[];
  feitos: Set<string>;
};

/** Pedido válido que o estado atual não permite: vira 409 com `motivo` depois que a transação fecha. */
class Recusa {
  constructor(
    readonly motivo: string,
    readonly mensagem: string,
    readonly detalhes?: unknown,
  ) {}
}

/** Só quem está em OWNER_EMAILS tem plano. */
export async function ehDono(userId: string) {
  const [u] = await db().select({ email: users.email }).from(users).where(eq(users.id, userId));
  return !!u && recebeConteudoPessoal(u.email);
}

export async function exigirDono(userId: string) {
  if (!(await ehDono(userId))) throw new Proibido("Nenhum plano de estudos nesta conta.");
}

export async function carregar(userId: string, agora: Date): Promise<Contexto> {
  const [ajustes, cat, progresso] = await Promise.all([
    obterAjustes(userId),
    catalogoDoBanco(),
    db()
      .select({ codigo: planoProgresso.codigo, em: planoProgresso.concluidoEm })
      .from(planoProgresso)
      .where(eq(planoProgresso.userId, userId)),
  ]);
  const conclusoes = progresso.map((p) => ({ codigo: p.codigo, em: p.em.toISOString() }));
  return {
    userId,
    agora,
    hoje: hojeLocal(agora, ajustes.fuso),
    cat,
    ajustes,
    conclusoes,
    feitos: new Set(conclusoes.map((c) => c.codigo)),
  };
}

/**
 * Toda escrita passa por aqui: só dono, numa transação com trava por usuário (dois toques
 * simultâneos não concluem duas vezes). Devolver uma `Recusa` vira 409 depois do commit, então o
 * que já foi gravado antes dela (a tentativa de prova) fica; o resto da resposta é o estado novo.
 */
async function escrever<T extends object>(
  userId: string,
  agora: Date,
  fn: (ctx: Contexto) => Promise<Recusa | T>,
  { exigeInicio = true } = {},
) {
  await exigirDono(userId);
  const resultado = await naTransacao(async () => {
    await db().execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`plano:${userId}`}, 0))`,
    );
    const ctx = await carregar(userId, agora);
    if (exigeInicio && !ctx.ajustes.planoIniciadoEm) {
      return new Recusa("nao_iniciado", "Faça a primeira abertura do plano antes.");
    }
    return fn(ctx);
  });
  if (resultado instanceof Recusa) {
    throw new Conflito(resultado.mensagem, resultado.detalhes, resultado.motivo);
  }
  return { ...resultado, ...(await estadoDoPlano(userId, agora)) };
}

function itemAtivo(cat: Catalogo, codigo: string): ItemPlano {
  const item = itemPorCodigo(cat, codigo);
  if (!item?.ativo) throw new NaoEncontrado("Conteúdo");
  return item;
}

// ---------------------------------------------------------------- Leitura do estado

const MAX_PROXIMOS = 3;

/**
 * Estado do plano para a tela: `{ plano: null }` fora do OWNER_EMAILS; antes da primeira abertura,
 * o catálogo para marcar o que já foi feito; depois, as trilhas, as horas, o recrutamento e o dia.
 */
export async function estadoDoPlano(userId: string, agora = new Date()) {
  if (!(await ehDono(userId))) return { plano: null };
  const ctx = await carregar(userId, agora);
  const { cat, feitos, hoje } = ctx;

  if (!ctx.ajustes.planoIniciadoEm) {
    return {
      plano: {
        iniciado: false as const,
        hoje,
        sugestao: [...SUGESTAO_INICIAL],
        catalogo: {
          trilhas: cat.trilhas,
          fases: cat.fases,
          itens: cat.itens
            .filter((i) => i.ativo)
            .map((i) => ({
              codigo: i.codigo,
              trilha: i.trilha,
              fase: i.fase ?? null,
              titulo: i.titulo,
              requisitos: i.requisitos,
              opcional: i.opcional,
            })),
        },
      },
    };
  }

  const [checks, tentativas, blocos, contagens, [folga]] = await Promise.all([
    db().select().from(planoChecks).where(eq(planoChecks.userId, userId)),
    db()
      .select()
      .from(planoTentativas)
      .where(eq(planoTentativas.userId, userId))
      .orderBy(asc(planoTentativas.feitaEm)),
    db().select().from(planoBlocos).where(eq(planoBlocos.userId, userId)),
    db()
      .select()
      .from(planoContagens)
      .where(and(eq(planoContagens.userId, userId), eq(planoContagens.semana, segundaDe(hoje)))),
    db()
      .select()
      .from(planoFolgas)
      .where(and(eq(planoFolgas.userId, userId), eq(planoFolgas.data, hoje))),
  ]);

  const marcados = (codigo: string, grupo: string) =>
    checks
      .filter((c) => c.codigo === codigo && c.grupo === grupo && c.feito)
      .map((c) => c.indice)
      .sort((a, b) => a - b);
  const registrados = blocos
    .filter((b) => b.feitoEm)
    .map((b) => ({ codigo: b.codigoEstudado, minutos: b.minutos }));

  const estadoDoItemAtual = (item: ItemPlano, estado: string, pendentes: Pendente[]) => ({
    codigo: item.codigo,
    titulo: item.titulo,
    fase: item.fase ?? null,
    estudar: item.estudar ?? null,
    recurso: item.recurso ?? null,
    criterio: item.criterio,
    horas: item.horas,
    horasGastas: horasGastas(registrados, item.codigo),
    avaliacao: item.avaliacao,
    antesDeComecar: item.antesDeComecar,
    etapas: item.etapas,
    entrega: item.entrega,
    opcional: item.opcional,
    estado,
    pendentes,
    checks: {
      antes: marcados(item.codigo, "antes"),
      etapas: marcados(item.codigo, "etapas"),
      entrega: marcados(item.codigo, "entrega"),
    },
    tentativas: tentativas
      .filter((t) => t.codigo === item.codigo)
      .map((t) => ({ nota: t.nota, aprovada: t.aprovada, feitaEm: t.feitaEm })),
  });

  const trilhas = cat.trilhas.map((t) => {
    const e = estadoTrilha(cat, t.slug, feitos);
    return {
      slug: t.slug,
      nome: t.nome,
      bloco: t.bloco,
      estado: e.estado,
      atual: e.atual ? estadoDoItemAtual(e.atual, e.estado, e.pendentes) : null,
      proximos: e.seguintes
        .slice(0, MAX_PROXIMOS)
        .map((i) => ({ codigo: i.codigo, titulo: i.titulo })),
      concluidos: e.concluidos
        .map((i) => ({
          codigo: i.codigo,
          titulo: i.titulo,
          concluidoEm: ctx.conclusoes.find((c) => c.codigo === i.codigo)!.em,
          desfazivel: verificarDesfazer(cat, i.codigo, ctx.conclusoes).ok,
        }))
        .sort((a, b) => b.concluidoEm.localeCompare(a.concluidoEm)),
      progresso: progressoTrilha(cat, t.slug, feitos),
      horasRestantes: horasRestantes(cat, feitos, { trilha: t.slug }),
    };
  });

  const recrutamento = recrutamentoLiberado(cat, feitos)
    ? {
        checklist: cat.recrutamento.checklist.map((texto, i) => ({
          texto,
          feito: marcados(RECRUTAMENTO, RECRUTAMENTO).includes(i),
        })),
        contadores: cat.recrutamento.contadores.map((c) => ({
          ...c,
          feitas: contagens.find((x) => x.chave === c.chave)?.contagem ?? 0,
        })),
      }
    : null;

  const diaUtil = ehDiaUtil(hoje);
  return {
    plano: {
      iniciado: true as const,
      hoje,
      /** Fuso do usuário: a tela mostra a data de conclusão no dia local. */
      fuso: ctx.ajustes.fuso,
      /** Texto do checklist de entrega; `checks.entrega` do item atual aponta para estes índices. */
      padraoDeEntrega: cat.padraoDeEntrega,
      trilhas,
      fases: cat.fases.map((f) => ({
        ...f,
        horasRestantes: horasRestantes(cat, feitos, { fase: f.numero }),
      })),
      horasRestantes: horasRestantes(cat, feitos),
      recrutamento,
      dia: {
        diaUtil,
        folga: folga?.minutos ?? null,
        blocos: blocosPlano.map((bloco) => {
          const registro = blocos.find((b) => b.data === hoje && b.bloco === bloco);
          const conteudo = conteudoDoBloco(cat, bloco, {
            feitos,
            troca: registro?.escolha,
            estudadosHoje: estudadosNoDia(blocos, hoje, bloco),
          });
          return {
            bloco,
            texto: textoBloco(conteudo),
            escolha: gravarEscolha(conteudo.conteudo),
            origem: conteudo.origem,
            feito: !!registro?.feitoEm,
            minutos: registro?.feitoEm
              ? registro.minutos
              : minutosDoBloco(hoje, bloco, ctx.ajustes.blocosPlano, folga?.minutos ?? null),
          };
        }),
        opcoesDeTroca: opcoesDeTroca(cat, feitos).map(gravarEscolha),
      },
    },
  };
}

// ---------------------------------------------------------------- Primeira abertura

/** Grava o que já foi concluído (origem `inicio`) e fecha a primeira abertura. Só uma vez. */
export function iniciarPlano(
  userId: string,
  entrada: z.output<typeof planoInicioSchema>,
  agora = new Date(),
) {
  return escrever(
    userId,
    agora,
    async (ctx) => {
      const { cat } = ctx;
      if (ctx.ajustes.planoIniciadoEm) {
        return new Recusa("ja_iniciado", "A primeira abertura do plano já foi feita.");
      }
      const marcados = [...new Set(entrada.marcados)];
      const desconhecidos = marcados.filter((c) => !itemPorCodigo(cat, c)?.ativo);
      if (desconhecidos.length) {
        throw new EntradaInvalida(`Conteúdo não encontrado: ${desconhecidos.join(", ")}.`);
      }
      const faltam = requisitosNaoMarcados(cat, marcados);
      if (faltam.length && !entrada.incluirRequisitos) {
        throw new EntradaInvalida(
          `Marque também os requisitos: ${faltam.map(rotulo).join(", ")}.`,
          { requisitos: faltam },
        );
      }
      const finais = [...fechamento(cat, marcados)];
      if (finais.length) {
        await db()
          .insert(planoProgresso)
          .values(finais.map((codigo) => ({ userId: ctx.userId, codigo, concluidoEm: ctx.agora })));
        await db()
          .insert(planoHistorico)
          .values(
            finais.map((codigo) => ({
              userId: ctx.userId,
              codigo,
              acao: "inicio_marcado" as const,
              em: ctx.agora,
              origem: "inicio" as const,
            })),
          );
      }
      await db()
        .update(settings)
        .set({ planoIniciadoEm: ctx.agora })
        .where(eq(settings.userId, ctx.userId));
      return { marcados: finais };
    },
    { exigeInicio: false },
  );
}

// ---------------------------------------------------------------- Concluir, tentativa, desfazer

/** Por que o item não aceita tentativa de prova agora (nulo quando aceita). */
function negarTentativa(cat: Catalogo, item: ItemPlano, feitos: Set<string>): Recusa | null {
  const estado = estadoDoItem(cat, item.codigo, feitos);
  if (estado === "concluido") {
    return new Recusa("concluido", `${rotulo(item)} já está concluído.`);
  }
  if (estado === "bloqueado") {
    const atual = estadoTrilha(cat, item.trilha, feitos).atual!;
    return new Recusa(
      "nao_e_atual",
      `Só o conteúdo atual da trilha aceita tentativa: ${rotulo(atual)}.`,
    );
  }
  if (estado === "aguardando") {
    return new Recusa("requisito_pendente", `${rotulo(item)} ainda aguarda requisitos.`);
  }
  if (item.avaliacao?.tipo !== "nota") {
    return new Recusa("sem_nota", "Este conteúdo não tem prova com nota.");
  }
  return null;
}

async function gravarTentativa(ctx: Contexto, item: ItemPlano, nota: number) {
  const aprovada = tentativaAprovada(item.avaliacao, nota);
  await db()
    .insert(planoTentativas)
    .values({ userId: ctx.userId, codigo: item.codigo, nota, aprovada, feitaEm: ctx.agora });
  return aprovada;
}

function tentativasDe(userId: string, codigo: string) {
  return db()
    .select({ nota: planoTentativas.nota, aprovada: planoTentativas.aprovada })
    .from(planoTentativas)
    .where(and(eq(planoTentativas.userId, userId), eq(planoTentativas.codigo, codigo)));
}

const aprovacoesDe = (item: ItemPlano, tentativas: { nota: number; aprovada: boolean }[]) =>
  tentativas.filter(
    (t) => t.aprovada && item.avaliacao?.tipo === "nota" && t.nota >= item.avaliacao.minima,
  );

/** Registra uma tentativa de prova (nota 0 a 100) no item atual disponível com avaliação por nota. */
export function registrarTentativa(
  userId: string,
  codigo: string,
  entrada: z.output<typeof tentativaPlanoSchema>,
  agora = new Date(),
) {
  return escrever(userId, agora, async (ctx) => {
    const item = itemAtivo(ctx.cat, codigo);
    const negada = negarTentativa(ctx.cat, item, ctx.feitos);
    if (negada) return negada;
    const aprovada = await gravarTentativa(ctx, item, entrada.nota);
    const aprovacoes = aprovacoesDe(item, await tentativasDe(ctx.userId, codigo)).length;
    return {
      tentativa: {
        nota: entrada.nota,
        aprovada,
        mensagem: mensagemTentativa(item, entrada.nota, aprovacoes),
      },
    };
  });
}

/**
 * Conclui o item atual. Uma nota enviada junto vira tentativa antes da verificação (e fica
 * gravada mesmo que a conclusão seja recusada). Devolve o que a conclusão liberou.
 */
export function concluirItem(
  userId: string,
  codigo: string,
  entrada: z.output<typeof conclusaoPlanoSchema>,
  agora = new Date(),
) {
  return escrever(userId, agora, async (ctx) => {
    const { cat, feitos } = ctx;
    const item = itemAtivo(cat, codigo);
    if (entrada.nota !== undefined && !negarTentativa(cat, item, feitos)) {
      await gravarTentativa(ctx, item, entrada.nota);
    }
    const [marcas, tentativas] = await Promise.all([
      db()
        .select({ grupo: planoChecks.grupo, indice: planoChecks.indice })
        .from(planoChecks)
        .where(
          and(
            eq(planoChecks.userId, ctx.userId),
            eq(planoChecks.codigo, codigo),
            eq(planoChecks.feito, true),
          ),
        ),
      tentativasDe(ctx.userId, codigo),
    ]);
    const indices = (grupo: string) => marcas.filter((m) => m.grupo === grupo).map((m) => m.indice);
    const v = verificarConclusao(cat, codigo, {
      feitos,
      antes: indices("antes"),
      entrega: indices("entrega"),
      tentativas,
      aprovado: entrada.aprovado,
    });
    if (!v.ok) {
      const comNota = v.motivo === "nota_insuficiente" && entrada.nota !== undefined;
      const mensagem = comNota
        ? mensagemTentativa(item, entrada.nota!, aprovacoesDe(item, tentativas).length)
        : v.mensagem;
      return new Recusa(v.motivo, mensagem, v.pendentes && { pendentes: v.pendentes });
    }

    // Nos itens com nota, guarda a melhor nota aprovada.
    const aprovadas = aprovacoesDe(item, tentativas).map((t) => t.nota);
    await db()
      .insert(planoProgresso)
      .values({
        userId: ctx.userId,
        codigo,
        concluidoEm: ctx.agora,
        notaFinal: aprovadas.length ? Math.max(...aprovadas) : null,
      });
    await db()
      .insert(planoHistorico)
      .values({ userId: ctx.userId, codigo, acao: "concluido", em: ctx.agora, origem: "tela" });

    const liberacao = liberadosApos(cat, feitos, codigo);
    return {
      concluido: codigo,
      liberacao: textoLiberacao(cat, liberacao),
      liberados: {
        proximo: liberacao.proximo?.item.codigo ?? null,
        tambem: liberacao.tambem.map((i) => i.codigo),
      },
    };
  });
}

/** Desfaz a conclusão mais recente da trilha, se nenhum item concluído depender dela. */
export function desfazerConclusao(userId: string, codigo: string, agora = new Date()) {
  return escrever(userId, agora, async (ctx) => {
    const v = verificarDesfazer(ctx.cat, codigo, ctx.conclusoes);
    if (!v.ok) return new Recusa(v.motivo, v.mensagem, v.impede && { impede: v.impede });
    await db()
      .delete(planoProgresso)
      .where(and(eq(planoProgresso.userId, ctx.userId), eq(planoProgresso.codigo, codigo)));
    await db()
      .insert(planoHistorico)
      .values({ userId: ctx.userId, codigo, acao: "desfeito", em: ctx.agora, origem: "tela" });
    return { desfeito: codigo };
  });
}

// ---------------------------------------------------------------- Checklists e contador

/** Marca ou desmarca um item de checklist: do item atual de uma trilha ou do recrutamento. */
export function marcarCheck(
  userId: string,
  entrada: z.output<typeof checkPlanoSchema>,
  agora = new Date(),
) {
  return escrever(userId, agora, async (ctx) => {
    const { cat, feitos } = ctx;
    let codigo = RECRUTAMENTO;
    let tamanho = cat.recrutamento.checklist.length;
    if (entrada.grupo === "recrutamento") {
      if (!recrutamentoLiberado(cat, feitos)) {
        return new Recusa("recrutamento_bloqueado", "O recrutamento ainda não foi liberado.");
      }
    } else {
      const item = itemAtivo(cat, entrada.codigo);
      const atual = estadoTrilha(cat, item.trilha, feitos).atual;
      if (atual?.codigo !== item.codigo) {
        return new Recusa("nao_e_atual", "O checklist só vale para o conteúdo atual da trilha.");
      }
      codigo = item.codigo;
      tamanho = {
        antes: item.antesDeComecar.length,
        etapas: item.etapas.length,
        entrega: item.entrega ? cat.padraoDeEntrega.length : 0,
      }[entrada.grupo];
    }
    if (entrada.indice >= tamanho) throw new EntradaInvalida("Item do checklist inexistente.");

    const feitoEm = entrada.feito ? ctx.agora : null;
    await db()
      .insert(planoChecks)
      .values({
        userId: ctx.userId,
        codigo,
        grupo: entrada.grupo,
        indice: entrada.indice,
        feito: entrada.feito,
        feitoEm,
      })
      .onConflictDoUpdate({
        target: [planoChecks.userId, planoChecks.codigo, planoChecks.grupo, planoChecks.indice],
        set: { feito: entrada.feito, feitoEm },
      });
    return {};
  });
}

/** Soma 1 no contador do recrutamento, na semana (segunda a domingo) de hoje. */
export function somarContador(userId: string, chave: string, agora = new Date()) {
  return escrever(userId, agora, async (ctx) => {
    if (!ctx.cat.recrutamento.contadores.some((c) => c.chave === chave)) {
      throw new NaoEncontrado("Contador");
    }
    if (!recrutamentoLiberado(ctx.cat, ctx.feitos)) {
      return new Recusa("recrutamento_bloqueado", "O recrutamento ainda não foi liberado.");
    }
    await db()
      .insert(planoContagens)
      .values({ userId: ctx.userId, chave, semana: segundaDe(ctx.hoje), contagem: 1 })
      .onConflictDoUpdate({
        target: [planoContagens.userId, planoContagens.chave, planoContagens.semana],
        set: { contagem: sql`${planoContagens.contagem} + 1` },
      });
    return {};
  });
}

// ---------------------------------------------------------------- Dia: folga, bloco feito e troca

/** Resposta de "Hoje tem folga no estágio?": só hoje, só em dia útil, pode mudar no mesmo dia. */
export function responderFolga(
  userId: string,
  entrada: z.output<typeof folgaPlanoSchema>,
  agora = new Date(),
) {
  return escrever(userId, agora, async (ctx) => {
    if (!ehDiaUtil(ctx.hoje)) {
      return new Recusa("dia_sem_folga", "A pergunta da folga só vale em dia útil.");
    }
    await db()
      .insert(planoFolgas)
      .values({
        userId: ctx.userId,
        data: ctx.hoje,
        minutos: entrada.minutos,
        respondidaEm: ctx.agora,
      })
      .onConflictDoUpdate({
        target: [planoFolgas.userId, planoFolgas.data],
        set: { minutos: entrada.minutos, respondidaEm: ctx.agora },
      });
    return {};
  });
}

async function folgaDoDia(ctx: Contexto) {
  const [folga] = await db()
    .select({ minutos: planoFolgas.minutos })
    .from(planoFolgas)
    .where(and(eq(planoFolgas.userId, ctx.userId), eq(planoFolgas.data, ctx.hoje)));
  return folga?.minutos ?? null;
}

/** Só vale marcar ou trocar um bloco que existe hoje: manhã com folga, fim de semana ligado. */
async function blocoDeHoje(ctx: Contexto, bloco: BlocoPlano) {
  const folga = await folgaDoDia(ctx);
  const agendado = blocoAgendado(ctx.hoje, bloco, ctx.ajustes.blocosPlano, folga);
  return agendado
    ? { agendado }
    : new Recusa("bloco_fora_do_dia", "Este bloco não está no plano de hoje.");
}

function registroDoBloco(ctx: Contexto, bloco: BlocoPlano) {
  return db()
    .select()
    .from(planoBlocos)
    .where(
      and(
        eq(planoBlocos.userId, ctx.userId),
        eq(planoBlocos.data, ctx.hoje),
        eq(planoBlocos.bloco, bloco),
      ),
    );
}

/**
 * "Fiz este bloco" (hoje). O conteúdo estudado é resolvido aqui, pelas mesmas regras do bloco,
 * nunca pelo cliente. Desmarcar apaga a marca e os minutos daquela linha; a troca do dia fica.
 */
export function marcarBloco(
  userId: string,
  bloco: BlocoPlano,
  entrada: z.output<typeof blocoFeitoPlanoSchema>,
  agora = new Date(),
) {
  return escrever(userId, agora, async (ctx) => {
    const [registro] = await registroDoBloco(ctx, bloco);
    if (!entrada.feito) {
      if (registro) {
        await db()
          .update(planoBlocos)
          .set({ feitoEm: null, codigoEstudado: null, minutos: 0 })
          .where(eq(planoBlocos.id, registro.id));
      }
      return {};
    }
    const hoje = await blocoDeHoje(ctx, bloco);
    if (hoje instanceof Recusa) return hoje;
    const doDia = await db()
      .select()
      .from(planoBlocos)
      .where(and(eq(planoBlocos.userId, ctx.userId), eq(planoBlocos.data, ctx.hoje)));
    const conteudo = conteudoDoBloco(ctx.cat, bloco, {
      feitos: ctx.feitos,
      troca: registro?.escolha,
      estudadosHoje: estudadosNoDia(doDia, ctx.hoje, bloco),
    });
    const dados = {
      codigoEstudado: conteudo.item?.codigo ?? null,
      minutos: entrada.minutos ?? hoje.agendado.minutos,
      feitoEm: ctx.agora,
    };
    await db()
      .insert(planoBlocos)
      .values({ userId: ctx.userId, data: ctx.hoje, bloco, ...dados })
      .onConflictDoUpdate({
        target: [planoBlocos.userId, planoBlocos.data, planoBlocos.bloco],
        set: dados,
      });
    return {};
  });
}

/** Troca o conteúdo do bloco só hoje: um item atual disponível, "cards", ou nulo para limpar. */
export function trocarBloco(
  userId: string,
  bloco: BlocoPlano,
  entrada: z.output<typeof trocaPlanoSchema>,
  agora = new Date(),
) {
  return escrever(userId, agora, async (ctx) => {
    const [registro] = await registroDoBloco(ctx, bloco);
    if (registro?.feitoEm) {
      return new Recusa("bloco_feito", "Desmarque o bloco antes de trocar o conteúdo.");
    }
    const escolha = lerEscolha(entrada.escolha);
    if (escolha) {
      const hoje = await blocoDeHoje(ctx, bloco);
      if (hoje instanceof Recusa) return hoje;
      const v = verificarTroca(ctx.cat, escolha, ctx.feitos);
      if (!v.ok) return new Recusa(v.motivo, v.mensagem);
    }
    const gravada = escolha ? gravarEscolha(escolha) : null;
    if (!registro && !gravada) return {};
    await db()
      .insert(planoBlocos)
      .values({ userId: ctx.userId, data: ctx.hoje, bloco, escolha: gravada })
      .onConflictDoUpdate({
        target: [planoBlocos.userId, planoBlocos.data, planoBlocos.bloco],
        set: { escolha: gravada },
      });
    return {};
  });
}
