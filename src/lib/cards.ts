import type { ModoCard, OrigemCard, ResultadoCard } from "./dominio";
import { addDias, segundaDe } from "./tempo";
import { cardImportadoSchema, type CardImportado } from "./validacao";

// Repetição espaçada por caixas (Leitner). Funções puras: o servidor e o aparelho (offline)
// usam as mesmas, então a cópia local e o banco chegam sempre ao mesmo estado.

export const CAIXAS = [1, 2, 3, 4] as const;
/** Dias até a próxima revisão de quem acabou de entrar na caixa. */
export const INTERVALO_DIAS: Record<number, number> = { 1: 1, 2: 3, 3: 7, 4: 21 };
export const LIMITE_PADRAO = 20;

export type EstadoCard = {
  caixa: number;
  /** Sem data: card novo, nunca revisado. */
  proximaEm: string | null;
  acertos: number;
  erros: number;
};

export type CardAgendavel = {
  id: string;
  chave: string;
  trilha: string;
  tema: string;
  origem: OrigemCard;
  criadoEm: string;
  caixa: number;
  proximaEm: string | null;
  suspenso: boolean;
};

export type RespostaResumo = {
  cardId: string;
  data: string;
  resultado: ResultadoCard;
  modo: ModoCard;
};

/** O que o aparelho guarda de cada card (a cópia offline do acervo). */
export type CardCliente = CardAgendavel & {
  frente: string;
  verso: string;
  codigo: string | null;
  acertos: number;
  erros: number;
};
export type RespostaCliente = RespostaResumo & { id: string };

/**
 * Aplica uma resposta. Errou (em qualquer modo): volta para a caixa 1, revisão amanhã.
 * Acertou na sessão do dia: sobe uma caixa (a 4 continua na 4). Acertou no modo aleatório:
 * só conta na estatística, o agendamento não muda.
 */
export function responder<T extends EstadoCard>(
  card: T,
  resultado: ResultadoCard,
  modo: ModoCard,
  hoje: string,
): T {
  if (resultado === "errou") {
    return {
      ...card,
      caixa: 1,
      proximaEm: addDias(hoje, INTERVALO_DIAS[1]),
      erros: card.erros + 1,
    };
  }
  if (modo === "aleatorio") return { ...card, acertos: card.acertos + 1 };
  const caixa = Math.min(Math.max(card.caixa, 1) + 1, 4);
  return {
    ...card,
    caixa,
    proximaEm: addDias(hoje, INTERVALO_DIAS[caixa]),
    acertos: card.acertos + 1,
  };
}

export const vencido = (c: CardAgendavel, hoje: string) =>
  c.proximaEm !== null && c.proximaEm <= hoje;

const porCriacao = (a: CardAgendavel, b: CardAgendavel) =>
  a.criadoEm.localeCompare(b.criadoEm) || a.chave.localeCompare(b.chave);

/** Cards da sessão do dia que já foram respondidos hoje (contam no limite diário). */
export function respondidosHoje(respostas: RespostaResumo[], hoje: string): Set<string> {
  return new Set(respostas.filter((r) => r.data === hoje && r.modo === "dia").map((r) => r.cardId));
}

/**
 * Sessão do dia, na ordem: vencidos (até hoje, o mais atrasado primeiro), novos de origem
 * "erro", novos de "aula". Suspensos ficam de fora. O limite desconta o que já foi
 * respondido hoje, então reabrir a sessão continua de onde parou.
 */
export function sessaoDoDia<T extends CardAgendavel>(
  cards: T[],
  respostas: RespostaResumo[],
  limite: number,
  hoje: string,
): T[] {
  const feitos = respondidosHoje(respostas, hoje);
  const resta = Math.max(0, limite - feitos.size);
  const ativos = cards.filter((c) => !c.suspenso && !feitos.has(c.id));
  const vencidos = ativos
    .filter((c) => vencido(c, hoje))
    .sort(
      (a, b) => a.proximaEm!.localeCompare(b.proximaEm!) || a.caixa - b.caixa || porCriacao(a, b),
    );
  const novos = ativos.filter((c) => c.proximaEm === null).sort(porCriacao);
  return [
    ...vencidos,
    ...novos.filter((c) => c.origem === "erro"),
    ...novos.filter((c) => c.origem === "aula"),
  ].slice(0, resta);
}

// ---------------------------------------------------------------- Modo "Tema aleatório"

export type FiltroAcervo = { trilha?: string | null; tema?: string | null };

/** Cards que podem ser sorteados: todo o acervo (ou a trilha/tema escolhidos), sem os suspensos. */
export function disponiveis<T extends CardAgendavel>(cards: T[], filtro: FiltroAcervo = {}): T[] {
  return cards.filter(
    (c) =>
      !c.suspenso &&
      (!filtro.trilha || c.trilha === filtro.trilha) &&
      (!filtro.tema || c.tema === filtro.tema),
  );
}

/** Uma rodada: todos os disponíveis embaralhados, sem começar pelo card que acabou de sair. */
export function rodada<T extends { id: string }>(
  cards: T[],
  rng: () => number = Math.random,
  ultimoId?: string,
): T[] {
  const r = [...cards];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  if (r.length > 1 && r[0].id === ultimoId) [r[0], r[1]] = [r[1], r[0]];
  return r;
}

/**
 * Sorteio do modo aleatório. Nenhum card repete antes de todos os disponíveis saírem;
 * se a quantidade passar disso, começa outra rodada. Sem quantidade ("sem fim"), devolve
 * uma rodada e a tela pede a próxima quando ela acaba.
 */
export function sorteio<T extends CardAgendavel>(
  cards: T[],
  opcoes: FiltroAcervo & { quantidade: number | null },
  rng: () => number = Math.random,
): T[] {
  const lista = disponiveis(cards, opcoes);
  if (!lista.length) return [];
  const total = opcoes.quantidade ?? lista.length;
  const fila: T[] = [];
  while (fila.length < total) fila.push(...rodada(lista, rng, fila.at(-1)?.id));
  return fila.slice(0, total);
}

// ---------------------------------------------------------------- Importação

export const MAX_IMPORTACAO = 2000;

export type ErroImportacao = { indice: number; id: string | null; mensagens: string[] };
export type Importacao =
  | { ok: false; erro: string }
  | { ok: true; validos: CardImportado[]; repetidos: string[]; erros: ErroImportacao[] };

/**
 * Valida o JSON colado card a card: os válidos entram, ids que já estão no acervo
 * (ou repetidos no próprio JSON) são ignorados e os inválidos voltam com o motivo.
 */
export function validarImportacao(entrada: unknown, existentes: Iterable<string>): Importacao {
  const lista = Array.isArray(entrada)
    ? entrada
    : entrada &&
        typeof entrada === "object" &&
        Array.isArray((entrada as { cards?: unknown }).cards)
      ? (entrada as { cards: unknown[] }).cards
      : null;
  if (!lista) return { ok: false, erro: 'O JSON precisa ter uma lista "cards".' };
  if (!lista.length) return { ok: false, erro: 'A lista "cards" está vazia.' };
  if (lista.length > MAX_IMPORTACAO)
    return { ok: false, erro: `No máximo ${MAX_IMPORTACAO} cards por importação.` };

  const vistos = new Set(existentes);
  const validos: CardImportado[] = [];
  const repetidos: string[] = [];
  const erros: ErroImportacao[] = [];
  lista.forEach((item, indice) => {
    const r = cardImportadoSchema.safeParse(item);
    if (!r.success) {
      const bruto = (item as { id?: unknown } | null)?.id;
      erros.push({
        indice,
        id: typeof bruto === "string" && bruto.trim() ? bruto.trim() : null,
        mensagens: r.error.issues.map((i) =>
          i.path.length ? `${i.path.join(".")}: ${i.message}` : i.message,
        ),
      });
      return;
    }
    if (vistos.has(r.data.id)) {
      repetidos.push(r.data.id);
      return;
    }
    vistos.add(r.data.id);
    validos.push(r.data);
  });
  return { ok: true, validos, repetidos, erros };
}

// ---------------------------------------------------------------- Estatísticas

export type EstatisticasCards = {
  total: number;
  novos: number;
  suspensos: number;
  /** Cards já revisados em cada caixa (os novos ficam de fora). */
  porCaixa: Record<number, number>;
  porTema: { trilha: string; tema: string; acertos: number; erros: number; taxa: number | null }[];
  /** Cards diferentes que erraram desde segunda-feira. */
  erradosNaSemana: number;
};

export function estatisticas(
  cards: (CardAgendavel & { acertos: number; erros: number })[],
  respostas: RespostaResumo[],
  hoje: string,
): EstatisticasCards {
  const porCaixa: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const temas = new Map<string, { trilha: string; tema: string; acertos: number; erros: number }>();
  let novos = 0;
  let suspensos = 0;
  for (const c of cards) {
    if (c.suspenso) suspensos++;
    if (c.proximaEm === null) novos++;
    else porCaixa[c.caixa] = (porCaixa[c.caixa] ?? 0) + 1;
    const chave = `${c.trilha}\u0000${c.tema}`;
    const t = temas.get(chave) ?? { trilha: c.trilha, tema: c.tema, acertos: 0, erros: 0 };
    t.acertos += c.acertos;
    t.erros += c.erros;
    temas.set(chave, t);
  }
  const segunda = segundaDe(hoje);
  const errados = new Set(
    respostas
      .filter((r) => r.resultado === "errou" && r.data >= segunda && r.data <= hoje)
      .map((r) => r.cardId),
  );
  return {
    total: cards.length,
    novos,
    suspensos,
    porCaixa,
    porTema: [...temas.values()]
      .map((t) => ({ ...t, taxa: t.acertos + t.erros ? t.acertos / (t.acertos + t.erros) : null }))
      .sort((a, b) => a.trilha.localeCompare(b.trilha) || a.tema.localeCompare(b.tema)),
    erradosNaSemana: errados.size,
  };
}

/** Trilhas e temas do acervo, para os filtros. */
export function trilhasETemas(cards: { trilha: string; tema: string }[]) {
  const mapa = new Map<string, Set<string>>();
  for (const c of cards) {
    if (!mapa.has(c.trilha)) mapa.set(c.trilha, new Set());
    mapa.get(c.trilha)!.add(c.tema);
  }
  return [...mapa.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([trilha, temas]) => ({ trilha, temas: [...temas].sort((a, b) => a.localeCompare(b)) }));
}
