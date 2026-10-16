import { and, eq, gt, lt, or, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { studySessions, studyTracks, studyWeeks } from "../db/schema";
import { NOME_TRILHA, ROTINA, SLUG_TRILHA, TODOS_OS_DIAS } from "./trilha";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QualquerDb = NodePgDatabase<any>;

/**
 * Grava a trilha DevOps para um usuário. Idempotente: rodar de novo atualiza
 * conteúdo e datas, mas preserva o status (pendente ou feita) de cada sessão.
 */
export async function semearTrilha(db: QualquerDb, userId: string) {
  const [trilha] = await db
    .insert(studyTracks)
    .values({
      userId,
      slug: SLUG_TRILHA,
      nome: NOME_TRILHA,
      inicio: ROTINA.INICIO,
      fim: ROTINA.FIM,
      fases: ROTINA.FASES,
      marcos: ROTINA.MARCOS,
    })
    .onConflictDoUpdate({
      target: [studyTracks.userId, studyTracks.slug],
      set: {
        nome: NOME_TRILHA,
        inicio: ROTINA.INICIO,
        fim: ROTINA.FIM,
        fases: ROTINA.FASES,
        marcos: ROTINA.MARCOS,
      },
    })
    .returning({ id: studyTracks.id });

  const semanas = await db
    .insert(studyWeeks)
    .values(
      ROTINA.SEMANAS.map((s) => ({
        trackId: trilha.id,
        numero: s.n,
        inicio: s.inicio,
        fase: s.fase,
        tema: s.tema,
        parte: s.parte,
      })),
    )
    .onConflictDoUpdate({
      target: [studyWeeks.trackId, studyWeeks.numero],
      set: {
        inicio: sql`excluded.inicio`,
        fase: sql`excluded.fase`,
        tema: sql`excluded.tema`,
        parte: sql`excluded.parte`,
      },
    })
    .returning({ id: studyWeeks.id, numero: studyWeeks.numero });
  const idDaSemana = new Map(semanas.map((s) => [s.numero, s.id]));

  const sessoes = ROTINA.sessoesEntre(ROTINA.INICIO, ROTINA.FIM, TODOS_OS_DIAS);
  for (let i = 0; i < sessoes.length; i += 200) {
    await db
      .insert(studySessions)
      .values(
        sessoes.slice(i, i + 200).map((s) => ({
          userId,
          trackId: trilha.id,
          weekId: idDaSemana.get(s.semana)!,
          data: s.data,
          tipo: s.tipo,
          conteudo: s.texto,
        })),
      )
      .onConflictDoUpdate({
        target: [studySessions.trackId, studySessions.data],
        set: {
          weekId: sql`excluded.week_id`,
          tipo: sql`excluded.tipo`,
          conteudo: sql`excluded.conteudo`,
        },
      });
  }
  // Se as datas da trilha mudarem, as sessões que ficaram fora do período saem do banco.
  const removidas = await db
    .delete(studySessions)
    .where(
      and(
        eq(studySessions.trackId, trilha.id),
        or(lt(studySessions.data, ROTINA.INICIO), gt(studySessions.data, ROTINA.FIM)),
      ),
    )
    .returning({ id: studySessions.id });
  return {
    trilhaId: trilha.id,
    semanas: semanas.length,
    sessoes: sessoes.length,
    removidas: removidas.length,
  };
}
