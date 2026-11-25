import "server-only";
import { and, between, eq } from "drizzle-orm";
import {
  CARDS_E_CEREBRO,
  conteudoDoBloco,
  ehDiaUtil,
  estudadosNoDia,
  gravarEscolha,
  itemPorCodigo,
  montarBlocos,
  opcoesDeTroca,
  perguntaDaFolgaAberta,
  ROTULO_BLOCO,
  rotulo,
  textoBloco,
  type BlocoMontado,
} from "@/lib/plano";
import { addDias, partesLocais } from "@/lib/tempo";
import { ocorrenciaDoBloco } from "../agenda/blocos";
import type { Intervalo } from "../agenda/recorrencia";
import { db } from "../db";
import { planoBlocos, planoFolgas } from "../db/schema";
import { cardsDeHoje } from "./cards";
import { carregar, ehDono, type Contexto } from "./plano";
import { errosVencidos } from "./revisao";

/** Folgas e registros de blocos do intervalo, direto do banco. */
async function lerDados(userId: string, intervalo: Intervalo) {
  const [folgas, registros] = await Promise.all([
    db()
      .select({ data: planoFolgas.data, minutos: planoFolgas.minutos })
      .from(planoFolgas)
      .where(
        and(eq(planoFolgas.userId, userId), between(planoFolgas.data, intervalo.de, intervalo.ate)),
      ),
    db()
      .select()
      .from(planoBlocos)
      .where(
        and(eq(planoBlocos.userId, userId), between(planoBlocos.data, intervalo.de, intervalo.ate)),
      ),
  ]);
  return { folgas, registros };
}

/** Blocos do intervalo com o plano já carregado (as folgas e os registros vêm do banco). */
async function montar(
  ctx: Contexto,
  intervalo: Intervalo,
  dados?: Awaited<ReturnType<typeof lerDados>>,
): Promise<BlocoMontado[]> {
  const { folgas, registros } = dados ?? (await lerDados(ctx.userId, intervalo));
  return montarBlocos({
    cat: ctx.cat,
    feitos: ctx.feitos,
    ajustes: ctx.ajustes.blocosPlano,
    intervalo,
    folgas: new Map(folgas.map((f) => [f.data, f.minutos])),
    registros,
  });
}

/** O plano do usuário, ou nulo se ele não é dono ou ainda não fez a primeira abertura. */
async function planoIniciado(userId: string, agora: Date): Promise<Contexto | null> {
  if (!(await ehDono(userId))) return null;
  const ctx = await carregar(userId, agora);
  return ctx.ajustes.planoIniciadoEm ? ctx : null;
}

/**
 * Única montagem dos blocos do dia no servidor: Hoje, Agenda, conflitos e calendário passam por
 * aqui. Quem não é dono, ou ainda não fez a primeira abertura, não tem blocos.
 */
export async function blocosDoPlano(
  userId: string,
  intervalo: Intervalo,
  agora = new Date(),
): Promise<BlocoMontado[]> {
  const ctx = await planoIniciado(userId, agora);
  return ctx ? montar(ctx, intervalo) : [];
}

export async function ocorrenciasDeBlocos(userId: string, intervalo: Intervalo) {
  const ctx = await planoIniciado(userId, new Date());
  if (!ctx) return [];
  const blocos = await montar(ctx, intervalo);
  return blocos.map((b) => ocorrenciaDoBloco(b, ctx.ajustes.fuso));
}

/**
 * O que os avisos do plano precisam: os blocos e as folgas respondidas do intervalo e o texto da
 * manhã. Nulo para quem não é dono, antes da primeira abertura e sem `estudos` nas áreas.
 */
export async function planoParaAvisos(userId: string, intervalo: Intervalo, agora = new Date()) {
  const ctx = await planoIniciado(userId, agora);
  if (!ctx || !ctx.ajustes.areasNoFeed.includes("estudos")) return null;
  const dados = await lerDados(userId, intervalo);
  const blocos = await montar(ctx, intervalo, dados);
  // O mesmo conteúdo que o Hoje mostra na manhã do dia: troca gravada e o que já foi estudado.
  const textosDaManha = new Map<string, string>();
  for (let data = intervalo.de; data <= intervalo.ate; data = addDias(data, 1)) {
    const manha = dados.registros.find((r) => r.data === data && r.bloco === "manha");
    textosDaManha.set(
      data,
      textoBloco(
        conteudoDoBloco(ctx.cat, "manha", {
          feitos: ctx.feitos,
          troca: manha?.escolha,
          estudadosHoje: estudadosNoDia(dados.registros, data, "manha"),
        }),
      ),
    );
  }
  return {
    ajustes: ctx.ajustes,
    hoje: ctx.hoje,
    blocos,
    folgas: new Map(dados.folgas.map((f) => [f.data, f.minutos])),
    textosDaManha,
  };
}

/** Destino do "Abrir": a trilha do item em `/plano`, ou o topo da página no plano B de cards. */
const destinoDoBloco = (b: BlocoMontado) =>
  b.conteudo.item ? `/plano#trilha-${b.conteudo.item.trilha}` : "/plano";

/** O que o plano B "Cards e Cerebro" mostra: cards do dia e os erros do caderno já vencidos. */
async function materialDoCardsECerebro(ctx: Contexto) {
  const [cards, erros] = await Promise.all([
    cardsDeHoje(ctx.userId, ctx.hoje, ctx.ajustes.limiteCards),
    errosVencidos(ctx.userId, ctx.hoje),
  ]);
  return { cards, erros };
}

/**
 * O que o Hoje mostra do plano: `null` fora do OWNER_EMAILS; antes da primeira abertura só o
 * convite; depois a folga, os blocos de hoje e as opções de troca.
 */
export async function planoDeHoje(userId: string, agora = new Date()) {
  if (!(await ehDono(userId))) return null;
  const ctx = await planoIniciado(userId, agora);
  if (!ctx) return { iniciado: false as const };

  const { hoje } = ctx;
  const [folga] = await db()
    .select({ minutos: planoFolgas.minutos })
    .from(planoFolgas)
    .where(and(eq(planoFolgas.userId, userId), eq(planoFolgas.data, hoje)));
  const blocos = await montar(ctx, { de: hoje, ate: hoje });
  const minutosLocais = partesLocais(agora, ctx.ajustes.fuso).minutos;
  const emCardsECerebro = blocos.some((b) => !b.conteudo.item);
  const cardsECerebro = emCardsECerebro ? await materialDoCardsECerebro(ctx) : null;
  return {
    iniciado: true as const,
    hoje,
    cardsECerebro,
    diaUtil: ehDiaUtil(hoje),
    folga: folga?.minutos ?? null,
    perguntarFolga: perguntaDaFolgaAberta(hoje, folga?.minutos ?? null, minutosLocais),
    blocos: blocos.map((b) => ({
      bloco: b.bloco,
      rotulo: ROTULO_BLOCO[b.bloco],
      inicio: b.inicio,
      minutos: b.minutos,
      texto: b.texto,
      feito: b.feito,
      minutosFeitos: b.minutosFeitos,
      destino: destinoDoBloco(b),
      emCardsECerebro: !b.conteudo.item,
    })),
    opcoesDeTroca: opcoesDeTroca(ctx.cat, ctx.feitos).map((e) => ({
      valor: gravarEscolha(e),
      texto: e.tipo === "cards" ? CARDS_E_CEREBRO : rotulo(itemPorCodigo(ctx.cat, e.codigo)!),
    })),
  };
}

export type PlanoDeHoje = NonNullable<Awaited<ReturnType<typeof planoDeHoje>>>;
