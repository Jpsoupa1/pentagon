import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { AreaId } from "../../lib/dominio";
import { addDias, FUSO_PADRAO, hojeLocal, paraUtc, segundaDe } from "../../lib/tempo";
import { events, settings, subjects } from "../db/schema";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QualquerDb = NodePgDatabase<any>;

/** Rotina inicial. Fica no banco como compromissos comuns: tudo editável pelo app. */
export const DISCIPLINAS = [
  { nome: "Algoritmos e Estrutura de Dados", sigla: "AED", dia: 1 },
  { nome: "Análise e Projeto de Sistemas", sigla: "APS", dia: 2 },
  { nome: "Cálculo", sigla: "CALC", dia: 3 },
  { nome: "Desenvolvimento Web", sigla: "DWEB", dia: 4 },
  { nome: "Integração DevOps", sigla: "IDO", dia: 5 },
] as const;

type Compromisso = {
  titulo: string;
  areaId: AreaId;
  dias: number[];
  hora: string;
  minutos: number;
  lembrarMin: number;
  local?: string;
  notas?: string;
  sigla?: string;
};

export const COMPROMISSOS: Compromisso[] = [
  {
    titulo: "Estágio na Codevasf",
    areaId: "estagio",
    dias: [1, 2, 3, 4, 5],
    hora: "07:30",
    minutos: 270,
    lembrarMin: 15,
    local: "Codevasf",
  },
  {
    titulo: "Academia",
    areaId: "pessoal",
    dias: [1, 2, 3, 4, 5],
    hora: "16:00",
    minutos: 90,
    lembrarMin: 10,
    notas:
      "Horário sugerido: termina às 17:30 e sobra tempo para o deslocamento antes da aula das 19:10.",
  },
  ...DISCIPLINAS.map((d) => ({
    titulo: d.nome,
    areaId: "aulas" as const,
    dias: [d.dia],
    hora: "19:10",
    minutos: 170,
    lembrarMin: 15,
    sigla: d.sigla,
  })),
];

/**
 * Cria a rotina pessoal uma única vez por usuário (marca `settings.rotina_semeada_em`).
 * Rodar de novo não faz nada, para não recriar o que o usuário apagou ou mudou.
 */
export async function semearRotina(db: QualquerDb, userId: string, agora = new Date()) {
  await db.insert(settings).values({ userId }).onConflictDoNothing();
  const [ajuste] = await db.select().from(settings).where(eq(settings.userId, userId));
  if (ajuste.rotinaSemeadaEm) return { criada: false };

  const fuso = ajuste.fuso ?? FUSO_PADRAO;
  const segunda = segundaDe(hojeLocal(agora, fuso));

  await db.transaction(async (tx) => {
    const criadas = await tx
      .insert(subjects)
      .values(DISCIPLINAS.map((d) => ({ userId, nome: d.nome, sigla: d.sigla })))
      .returning({ id: subjects.id, sigla: subjects.sigla });
    const idPorSigla = new Map(criadas.map((s) => [s.sigla, s.id]));

    await tx.insert(events).values(
      COMPROMISSOS.map((c) => {
        // Primeira ocorrência: o primeiro dia da semana atual em que o compromisso acontece.
        const primeiroDia = Math.min(...c.dias.map((d) => (d + 6) % 7));
        const data = addDias(segunda, primeiroDia);
        return {
          userId,
          titulo: c.titulo,
          areaId: c.areaId,
          subjectId: c.sigla ? idPorSigla.get(c.sigla) : null,
          local: c.local ?? null,
          notas: c.notas ?? null,
          inicio: paraUtc(data, c.hora, fuso),
          duracaoMin: c.minutos,
          fuso,
          diasSemana: c.dias,
          repeteDesde: data,
          lembrarMin: c.lembrarMin,
        };
      }),
    );
    await tx.update(settings).set({ rotinaSemeadaEm: agora }).where(eq(settings.userId, userId));
  });
  return { criada: true };
}
