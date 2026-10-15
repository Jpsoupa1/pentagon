import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { AREAS } from "../src/lib/areas";
import { areas } from "../src/server/db/schema";

/** Idempotente: cria ou atualiza as 5 áreas fixas. */
export async function semearAreas(db: NodePgDatabase) {
  await db
    .insert(areas)
    .values(
      AREAS.map((a, i) => ({
        id: a.id,
        nome: a.nome,
        cor: a.cor,
        fundo: a.fundo,
        texto: a.texto,
        ordem: i,
      })),
    )
    .onConflictDoUpdate({
      target: areas.id,
      set: {
        nome: sql`excluded.nome`,
        cor: sql`excluded.cor`,
        fundo: sql`excluded.fundo`,
        texto: sql`excluded.texto`,
        ordem: sql`excluded.ordem`,
      },
    });
}
