import { and, eq, ne, notInArray, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { studySessions, studyTracks, studyWeeks } from "../db/schema";
import { NOME_TRILHA, ROTINA, SLUG_TRILHA, sessoesDaDevops } from "./trilha";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QualquerDb = NodePgDatabase<any>;

/**
 * Grava a trilha DevOps para um usuário. Idempotente: rodar de novo atualiza conteúdo e datas,
 * mas preserva o status (pendente ou feita) de cada sessão, identificada pelo dia e pelo turno.
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

  const sessoes = sessoesDaDevops();
  const gravadas: string[] = [];
  for (let i = 0; i < sessoes.length; i += 200) {
    const linhas = await db
      .insert(studySessions)
      .values(
        sessoes.slice(i, i + 200).map((s) => ({
          userId,
          trackId: trilha.id,
          weekId: idDaSemana.get(s.semana)!,
          data: s.data,
          turno: s.turno,
          categoria: s.categoria,
          permiteSobreposicao: s.permiteSobreposicao,
          tipo: s.tipo,
          conteudo: s.texto,
        })),
      )
      .onConflictDoUpdate({
        target: [studySessions.trackId, studySessions.data, studySessions.turno],
        set: {
          weekId: sql`excluded.week_id`,
          categoria: sql`excluded.categoria`,
          permiteSobreposicao: sql`excluded.permite_sobreposicao`,
          tipo: sql`excluded.tipo`,
          conteudo: sql`excluded.conteudo`,
        },
      })
      .returning({ id: studySessions.id });
    gravadas.push(...linhas.map((l) => l.id));
  }
  // Sessões que a trilha não prevê mais (datas fora do período ou turno que deixou de existir)
  // saem. As já feitas ficam: são histórico.
  const removidas = await db
    .delete(studySessions)
    .where(
      and(
        eq(studySessions.trackId, trilha.id),
        notInArray(studySessions.id, gravadas),
        ne(studySessions.status, "feita"),
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
