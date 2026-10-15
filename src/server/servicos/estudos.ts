import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { studySessions, studyTracks } from "../db/schema";

/** Trilhas com o total de sessões e quantas foram feitas. */
export async function listarTrilhas(userId: string) {
  return db()
    .select({
      id: studyTracks.id,
      slug: studyTracks.slug,
      nome: studyTracks.nome,
      inicio: studyTracks.inicio,
      fim: studyTracks.fim,
      fases: studyTracks.fases,
      marcos: studyTracks.marcos,
      total: sql<number>`(select count(*) from ${studySessions} where ${studySessions.trackId} = ${studyTracks.id})::int`,
      feitas: sql<number>`(select count(*) from ${studySessions} where ${studySessions.trackId} = ${studyTracks.id} and ${studySessions.status} = 'feita')::int`,
    })
    .from(studyTracks)
    .where(eq(studyTracks.userId, userId))
    .orderBy(asc(studyTracks.inicio));
}

export async function sessoesEntre(userId: string, de: string, ate: string) {
  return db()
    .select()
    .from(studySessions)
    .where(
      and(eq(studySessions.userId, userId), sql`${studySessions.data} between ${de} and ${ate}`),
    )
    .orderBy(asc(studySessions.data));
}
