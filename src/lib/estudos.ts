import type { HorariosEstudo } from "./dominio";
import { addDias, segundaDe } from "./tempo";

// Regras da trilha que a interface também usa (sem dependências de servidor).

export const turnos = ["manha", "tarde", "noite"] as const;
export type Turno = (typeof turnos)[number];

export const categoriasSessao = [
  "conteudo",
  "pratica",
  "revisao_semanal",
  "projeto",
  "revisao_espacada",
  "reposicao",
] as const;
export type CategoriaSessao = (typeof categoriasSessao)[number];

/** Um horário editável em Ajustes: chave `<dia>-<turno>` (0 = domingo). */
export type TurnoEstudo = { chave: string; dia: number; turno: Turno; rotulo: string };

/** Na ordem da semana: as duas sessões de segunda a quinta, as duas da sexta, o sábado e o domingo. */
export const TURNOS_ESTUDO: TurnoEstudo[] = [
  ...[1, 2, 3, 4].flatMap((dia) => [
    { chave: `${dia}-manha`, dia, turno: "manha" as const, rotulo: "Conteúdo, no estágio" },
    { chave: `${dia}-tarde`, dia, turno: "tarde" as const, rotulo: "Prática" },
  ]),
  { chave: "5-manha", dia: 5, turno: "manha", rotulo: "Revisão da semana, no estágio" },
  { chave: "5-tarde", dia: 5, turno: "tarde", rotulo: "Reposição do que atrasou" },
  { chave: "6-manha", dia: 6, turno: "manha", rotulo: "Projeto" },
  { chave: "0-noite", dia: 0, turno: "noite", rotulo: "Revisão espaçada" },
];

export const CHAVES_TURNO = TURNOS_ESTUDO.map((t) => t.chave) as [string, ...string[]];

export function chaveTurno(diaSemana: number, turno: string) {
  return `${diaSemana}-${turno}`;
}

const sessao = (inicio: string, minutos: number) => ({ ativo: true, inicio, minutos });

/**
 * Horários padrão (cerca de 19 h por semana): conteúdo às 08:00 durante o estágio e prática
 * às 14:00 de segunda a quinta, revisão da semana às 08:00 e reposição do que atrasou às 14:00 na
 * sexta, projeto no sábado às 09:00 e revisão espaçada no domingo às 19:00.
 */
export const HORARIOS_PADRAO: HorariosEstudo = {
  "1-manha": sessao("08:00", 90),
  "2-manha": sessao("08:00", 90),
  "3-manha": sessao("08:00", 90),
  "4-manha": sessao("08:00", 90),
  "5-manha": sessao("08:00", 90),
  "1-tarde": sessao("14:00", 90),
  "2-tarde": sessao("14:00", 90),
  "3-tarde": sessao("14:00", 90),
  "4-tarde": sessao("14:00", 90),
  "5-tarde": sessao("14:00", 90),
  "6-manha": sessao("09:00", 180),
  "0-noite": sessao("19:00", 60),
};

/** Chaves da versão 1 (uma sessão por dia, `"0"` a `"6"`) e o turno em que elas continuam valendo. */
const TURNO_ANTIGO: Record<string, string> = {
  "1": "1-tarde",
  "2": "2-tarde",
  "3": "3-tarde",
  "4": "4-tarde",
  "6": "6-manha",
  "0": "0-noite",
};

/**
 * Horários de Ajustes com o padrão no que faltar. Os horários gravados na versão 1 (um por dia,
 * à tarde) continuam valendo para o turno equivalente; a sexta da versão 1 (Reposição) não volta
 * para a tarde de sexta: ela começa no horário padrão.
 */
export function horariosComPadrao(h: HorariosEstudo | null | undefined): HorariosEstudo {
  const saida = { ...HORARIOS_PADRAO };
  for (const [chave, valor] of Object.entries(h ?? {})) {
    const nova = TURNO_ANTIGO[chave] ?? chave;
    if (nova in saida) saida[nova] = valor;
  }
  return saida;
}

// ---------------------------------------------------------------- Revisão de sexta

/** Roteiro da revisão de sexta (docs/trilha/metodo-de-revisao.md). */
export const ETAPAS_REVISAO = [
  {
    minutos: 15,
    titulo: "Folha em branco",
    como: "Sem consultar nada, escreva tudo o que lembra da semana: conceitos, comandos, campos do YAML. O que você não conseguiu escrever é o que mais precisa de revisão.",
  },
  {
    minutos: 45,
    titulo: "Bateria da semana",
    como: "10 exercícios misturando todos os temas da semana, no terminal, cronometrados. Na fase da CKA, só com a documentação do Kubernetes aberta, como na prova.",
  },
  {
    minutos: 20,
    titulo: "Correção",
    como: "Confira com o gabarito, refaça na hora cada exercício errado e anote os erros no caderno.",
  },
  {
    minutos: 10,
    titulo: "Nota e pontos fracos",
    como: "Registre a nota (x de 10) e os 2 ou 3 pontos mais fracos da semana. Eles entram na revisão de domingo.",
  },
] as const;

// ---------------------------------------------------------------- Caderno de erros

/** Um erro volta para revisão três semanas depois. */
export const REVISAR_APOS_DIAS = 21;

export function dataDeRevisao(data: string) {
  return addDias(data, REVISAR_APOS_DIAS);
}

/** Último dia da semana (domingo) de uma data. */
export function domingoDe(data: string) {
  return addDias(segundaDe(data), 6);
}

/**
 * Erros para refazer na revisão espaçada da semana de `hoje`: os que ainda estão no caderno
 * com revisão marcada até o domingo dessa semana (inclusive os atrasados).
 */
export function errosDaSemana<E extends { revisarEm: string; resolvidoEm: Date | string | null }>(
  erros: E[],
  hoje: string,
): E[] {
  const ate = domingoDe(hoje);
  return erros
    .filter((e) => !e.resolvidoEm && e.revisarEm <= ate)
    .sort((a, b) => a.revisarEm.localeCompare(b.revisarEm));
}
