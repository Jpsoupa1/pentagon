import "server-only";
import { and, eq, isNotNull } from "drizzle-orm";
import type { z } from "zod";
import type { AvaliacaoVisivel, PropostaDoPlano } from "@/lib/assistente";
import {
  atuaisDisponiveis,
  estadoDoItem,
  estadoTrilha,
  formatarHoras,
  horasGastas,
  itemPorCodigo,
  ROTULO_BLOCO,
  rotulo,
  type BlocoMontado,
  type Catalogo,
  type Concluidos,
  type ItemPlano,
  type SlugTrilha,
} from "@/lib/plano";
import { hmParaMin, partesLocais } from "@/lib/tempo";
import { conclusaoPlanoSchema, type confirmacaoAssistenteSchema } from "@/lib/validacao";
import { db, naTransacao } from "../db";
import { assistantActions, planoBlocos } from "../db/schema";
import { Conflito } from "../erros";
import { catalogoDoBanco } from "../plano/catalogo";
import { blocosDoPlano } from "../servicos/blocos";
import { carregar, concluirItem, exigirDono, type Contexto } from "../servicos/plano";
import type { Execucao } from "./ferramentas";
import { descricao, fotoAtual, gravarAcao, obterAcao } from "./registro";

/**
 * Plano de estudos no assistente. Nada aqui decide regra de liberação: os textos vêm de
 * `@/lib/plano` e a conclusão passa por `concluirItem`, o mesmo serviço da tela do plano.
 */

/** `entidadeId` da proposta enquanto o conteúdo não foi escolhido no cartão. */
export const ESCOLHER_CONTEUDO = "escolher";

export type Confirmacao = z.output<typeof confirmacaoAssistenteSchema>;

// ---------------------------------------------------------------- Contexto do momento

/** Só dono com o plano aberto tem plano no assistente; os outros recebem a mensagem do serviço. */
async function planoDaConta(userId: string, agora: Date) {
  await exigirDono(userId);
  const ctx = await carregar(userId, agora);
  if (!ctx.ajustes.planoIniciadoEm) throw new Conflito("Faça a primeira abertura do plano antes.");
  const blocos = await blocosDoPlano(userId, { de: ctx.hoje, ate: ctx.hoje }, agora);
  return { ctx, blocos, minutos: partesLocais(agora, ctx.ajustes.fuso).minutos };
}

const emAndamento = (b: BlocoMontado, minutos: number) =>
  hmParaMin(b.inicio) <= minutos && minutos < hmParaMin(b.inicio) + b.minutos;

const nomeDaTrilha = (cat: Catalogo, slug: SlugTrilha) =>
  cat.trilhas.find((t) => t.slug === slug)?.nome ?? slug;

async function horasDoItem(userId: string, item: ItemPlano) {
  const registros = await db()
    .select({ codigo: planoBlocos.codigoEstudado, minutos: planoBlocos.minutos })
    .from(planoBlocos)
    .where(
      and(
        eq(planoBlocos.userId, userId),
        eq(planoBlocos.codigoEstudado, item.codigo),
        isNotNull(planoBlocos.feitoEm),
      ),
    );
  const restantes = Math.max(0, item.horas - horasGastas(registros, item.codigo));
  return `${formatarHoras(restantes)} restantes de ${formatarHoras(item.horas)}.`;
}

/** O item atual de uma trilha, se ele pode ser trabalhado ou concluído agora. */
function atualDisponivel(cat: Catalogo, trilha: SlugTrilha, feitos: Concluidos) {
  const e = estadoTrilha(cat, trilha, feitos);
  if (!e.atual) throw new Conflito(`A trilha ${nomeDaTrilha(cat, trilha)} já está concluída.`);
  if (e.estado !== "disponivel") {
    throw new Conflito(`Aguardando: ${e.pendentes.map(rotulo).join(", ")}.`);
  }
  return e.atual;
}

// ---------------------------------------------------------------- Consultar

/** Conteúdo de cada trilha para quando não há bloco: o atual, ou o motivo de não haver. */
function textoDosAtuais(cat: Catalogo, feitos: Concluidos) {
  return cat.trilhas
    .map((t) => {
      const e = estadoTrilha(cat, t.slug, feitos);
      if (!e.atual) return `${t.nome}: trilha concluída`;
      const espera =
        e.estado === "aguardando" ? `, aguardando ${e.pendentes.map(rotulo).join(", ")}` : "";
      return `${t.nome}: ${rotulo(e.atual)}${espera}`;
    })
    .join(". ");
}

async function textoAgora(
  userId: string,
  trilha: SlugTrilha | undefined,
  p: Awaited<ReturnType<typeof planoDaConta>>,
) {
  const { ctx, blocos, minutos } = p;
  const { cat, feitos } = ctx;
  if (trilha) {
    const e = estadoTrilha(cat, trilha, feitos);
    if (!e.atual) return `A trilha ${nomeDaTrilha(cat, trilha)} já está concluída.`;
    const horas = await horasDoItem(userId, e.atual);
    return `Agora, na trilha ${nomeDaTrilha(cat, trilha)}: ${rotulo(e.atual)}. ${horas}`;
  }
  const abertos = blocos.filter((b) => !b.feito);
  const bloco = abertos.find((b) => emAndamento(b, minutos));
  const proximo = bloco ? null : abertos.find((b) => hmParaMin(b.inicio) > minutos);
  const escolhido = bloco ?? proximo;
  if (!escolhido)
    return `Sem blocos no resto de hoje. Itens atuais: ${textoDosAtuais(cat, feitos)}.`;

  const horas = escolhido.conteudo.item
    ? ` ${await horasDoItem(userId, escolhido.conteudo.item)}`
    : "";
  const quando = bloco ? "Agora" : `Próximo bloco, às ${escolhido.inicio}`;
  const fim = escolhido.conteudo.item ? "." : "";
  return `${quando}: bloco ${ROTULO_BLOCO[escolhido.bloco]}, ${escolhido.texto}${fim}${horas}`.trimEnd();
}

function textoProximo(
  cat: Catalogo,
  feitos: Concluidos,
  slug: SlugTrilha,
  depoisDe: ItemPlano | null,
) {
  const e = estadoTrilha(cat, slug, feitos);
  const nome = nomeDaTrilha(cat, slug);
  if (!e.atual) return `A trilha ${nome} já está concluída.`;
  // Com um item em andamento, o seguinte é o que vem depois dele na trilha.
  const base = depoisDe ?? e.atual;
  const lista = [e.atual, ...e.seguintes];
  const seguinte = lista[lista.findIndex((i) => i.codigo === base.codigo) + 1];
  if (!seguinte) return `Depois de ${rotulo(base)} não há mais conteúdo na trilha ${nome}.`;
  return `Próximo conteúdo na trilha ${nome}, depois de ${rotulo(base)}: ${rotulo(seguinte)}.`;
}

async function textoProximoConteudo(
  trilha: SlugTrilha | undefined,
  p: Awaited<ReturnType<typeof planoDaConta>>,
) {
  const { ctx, blocos, minutos } = p;
  const { cat, feitos } = ctx;
  if (trilha) return textoProximo(cat, feitos, trilha, null);
  const abertos = blocos.filter((b) => !b.feito);
  const bloco =
    abertos.find((b) => emAndamento(b, minutos)) ??
    abertos.find((b) => hmParaMin(b.inicio) > minutos);
  const slug = bloco?.conteudo.item?.trilha;
  if (bloco && slug) return textoProximo(cat, feitos, slug, bloco.conteudo.item);
  return cat.trilhas.map((t) => textoProximo(cat, feitos, t.slug, null)).join(" ");
}

/** Responde "o que eu estudo agora?" e "qual o próximo conteúdo?" com texto montado pelo app. */
export async function consultarPlano(
  ex: Execucao,
  entrada: { pergunta: "agora" | "proximo"; trilha?: SlugTrilha },
) {
  const p = await planoDaConta(ex.userId, ex.agora);
  const texto =
    entrada.pergunta === "agora"
      ? await textoAgora(ex.userId, entrada.trilha, p)
      : await textoProximoConteudo(entrada.trilha, p);
  ex.consultasDoPlano.push(texto);
  return {
    texto:
      "Resposta pronta: o app mostra ao usuário. Termine com `responder` tipo `consulta`, sem repetir o conteúdo.",
  };
}

// ---------------------------------------------------------------- Propor a conclusão

/** O conteúdo que o usuário provavelmente terminou: o do bloco em andamento ou do último que começou. */
function conteudoDoMomento(p: Awaited<ReturnType<typeof planoDaConta>>) {
  const { ctx, blocos, minutos } = p;
  const iniciados = blocos.filter((b) => hmParaMin(b.inicio) <= minutos);
  const bloco = blocos.find((b) => emAndamento(b, minutos)) ?? iniciados.at(-1);
  const item = bloco?.conteudo.item;
  return item && estadoDoItem(ctx.cat, item.codigo, ctx.feitos) === "disponivel" ? item : null;
}

function descricaoDaProposta(item: ItemPlano | null, nota: number | null) {
  if (!item) return descricao("estudos", "Qual conteúdo você terminou?", []);
  return descricao("estudos", `Concluir ${rotulo(item)}?`, [
    { rotulo: "Critério", antes: null, depois: item.criterio },
    ...(nota === null ? [] : [{ rotulo: "Nota dita", antes: null, depois: `${nota}%` }]),
  ]);
}

/** Grava a proposta de concluir um conteúdo. Nada é concluído aqui: só o Confirmar conclui. */
export async function proporConclusao(
  ex: Execucao,
  entrada: { trilha?: SlugTrilha; nota?: number },
) {
  const p = await planoDaConta(ex.userId, ex.agora);
  const { cat, feitos } = p.ctx;
  const item = entrada.trilha ? atualDisponivel(cat, entrada.trilha, feitos) : conteudoDoMomento(p);
  if (!item && !atuaisDisponiveis(cat, feitos).length) {
    throw new Conflito("Nenhum conteúdo está disponível para concluir agora.");
  }
  // A nota só vale em item com prova por nota; no cartão sem item, ela segue até a escolha.
  const nota =
    entrada.nota !== undefined && (!item || item.avaliacao?.tipo === "nota") ? entrada.nota : null;
  await gravarAcao({
    runId: ex.runId,
    userId: ex.userId,
    tipo: "concluido",
    status: "proposta",
    entidade: "item_plano",
    entidadeId: item?.codigo ?? ESCOLHER_CONTEUDO,
    antes: null,
    // Os campos com `_` só guardam o pedido; o desfazer não os compara com o banco.
    depois: nota === null ? null : { _nota: nota },
    descricao: descricaoDaProposta(item, nota),
  });
  return { texto: "Proposta registrada. Nada foi concluído: o usuário confirma na tela." };
}

// ---------------------------------------------------------------- Confirmar

/**
 * O toque em Confirmar: conclui pelo serviço do plano, com as mesmas regras da tela (checklists,
 * nota mínima, só o item atual). Uma recusa vira a mensagem do serviço e a proposta continua
 * aberta; a tentativa de prova que ela gravou fica, como na tela.
 */
export async function confirmarConclusao(
  userId: string,
  id: string,
  escolha: Confirmacao,
  agora = new Date(),
) {
  const falha: { recusa?: Conflito } = {};
  await naTransacao(async () => {
    const a = await obterAcao(userId, id);
    if (a.status !== "proposta") throw new Conflito("Essa proposta não está mais aberta.");
    const definido = a.entidadeId !== ESCOLHER_CONTEUDO;
    const codigo = definido ? a.entidadeId : escolha.codigo;
    if (!codigo) throw new Conflito("Escolha o conteúdo que você terminou.");
    if (definido && escolha.codigo && escolha.codigo !== codigo) {
      throw new Conflito("Esta proposta é de outro conteúdo.");
    }
    const antes = await fotoAtual(userId, "item_plano", codigo);
    const nota = escolha.nota ?? (a.depois?._nota as number | undefined);
    let feito;
    try {
      feito = await concluirItem(
        userId,
        codigo,
        conclusaoPlanoSchema.parse({ nota, aprovado: escolha.aprovado }),
        agora,
      );
    } catch (e) {
      if (!(e instanceof Conflito)) throw e;
      falha.recusa = e;
      return;
    }
    const item = itemPorCodigo(await catalogoDoBanco(), codigo)!;
    await db()
      .update(assistantActions)
      .set({
        status: "feita",
        entidadeId: codigo,
        antes,
        depois: await fotoAtual(userId, "item_plano", codigo),
        descricao: descricao("estudos", rotulo(item), [
          { rotulo: "Situação", antes: "Em andamento", depois: "Concluído" },
          ...(feito.liberacao.length
            ? [{ rotulo: "Liberado", antes: null, depois: feito.liberacao.join(" · ") }]
            : []),
        ]),
        atualizadaEm: new Date(),
      })
      .where(eq(assistantActions.id, id));
  });
  if (falha.recusa) throw falha.recusa;
}

// ---------------------------------------------------------------- O que o cartão mostra

function itemParaConcluir(i: ItemPlano) {
  return {
    codigo: i.codigo,
    titulo: i.titulo,
    criterio: i.criterio,
    avaliacao: i.avaliacao as AvaliacaoVisivel | null,
  };
}

/** Item, critério e avaliação de uma proposta aberta, lidos do catálogo (nunca do texto da IA). */
export async function propostaVisivel(
  userId: string,
  a: typeof assistantActions.$inferSelect,
): Promise<PropostaDoPlano | null> {
  if (a.entidade !== "item_plano" || a.status !== "proposta") return null;
  const ctx: Contexto = await carregar(userId, new Date());
  const definido = a.entidadeId !== ESCOLHER_CONTEUDO;
  const itens = definido
    ? [itemPorCodigo(ctx.cat, a.entidadeId)].filter((i): i is ItemPlano => !!i?.ativo)
    : atuaisDisponiveis(ctx.cat, ctx.feitos);
  return {
    notaDita: (a.depois?._nota as number | undefined) ?? null,
    itens: itens.map(itemParaConcluir),
    definido,
  };
}
