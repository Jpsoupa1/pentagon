import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { arquivamentos, events, roadmapTrails, studyTracks, users } from "@/server/db/schema";
import { semearTrilha } from "@/server/estudos/seed";
import { CHAVE_ERROS_ANTES_DO_PLANO } from "@/server/plano/arquivados";
import { semearRoadmap } from "@/server/roadmap/seed";
import { listarArquivadas } from "@/server/servicos/arquivadas";
import { apagarUsuarioDeTeste, usuarioDeTeste } from "./apoio";

const OUTRO = "outro-arquivadas@pentagon.local";

let userId: string;

beforeAll(async () => {
  await semearRoadmap(db(), []);
});

beforeEach(async () => {
  userId = await usuarioDeTeste();
});

afterAll(async () => {
  await apagarUsuarioDeTeste();
  await db().delete(users).where(eq(users.email, OUTRO));
});

const arquivar = (
  id: string,
  tipo: (typeof arquivamentos.$inferInsert)["tipo"],
  chave: string,
  em: string,
) =>
  db()
    .insert(arquivamentos)
    .values({ userId: id, tipo, chave, arquivadoEm: new Date(em) });

describe("lista de arquivados", () => {
  it("traz nome legível e data, na ordem trilha, roadmap, cards, compromisso e erros", async () => {
    await semearTrilha(db(), userId);
    const [trilha] = await db().select().from(studyTracks).where(eq(studyTracks.userId, userId));
    const [evento] = await db()
      .select({ id: events.id, titulo: events.titulo })
      .from(events)
      .where(eq(events.userId, userId))
      .limit(1);
    // 02:30 UTC de 25/11 ainda é dia 24 em São Paulo.
    const em = "2026-11-25T02:30:00Z";
    await arquivar(userId, "erros", CHAVE_ERROS_ANTES_DO_PLANO, em);
    await arquivar(userId, "evento", evento.id, em);
    await arquivar(userId, "cards", "CKA", em);
    await arquivar(userId, "roadmap", "devops", em);
    await arquivar(userId, "trilha_estudo", trilha.slug, em);

    const [roadmap] = await db()
      .select()
      .from(roadmapTrails)
      .where(eq(roadmapTrails.slug, "devops"));
    const lista = await listarArquivadas(userId);
    expect(lista.map((i) => i.nome)).toEqual([
      trilha.nome,
      `Roadmap ${roadmap.nome}`,
      "Cards CKA",
      `Compromisso ${evento.titulo}`,
      "Erros anteriores ao plano",
    ]);
    expect(lista.every((i) => i.arquivadoEm === "24 de novembro")).toBe(true);
  });

  it("sem arquivamentos a lista é vazia, e o arquivado de outra conta não aparece", async () => {
    expect(await listarArquivadas(userId)).toEqual([]);
    await db().delete(users).where(eq(users.email, OUTRO));
    const [outro] = await db().insert(users).values({ name: OUTRO, email: OUTRO }).returning();
    await arquivar(outro.id, "cards", "CKA", "2026-11-24T12:00:00Z");
    expect(await listarArquivadas(userId)).toEqual([]);
    expect((await listarArquivadas(outro.id)).map((i) => i.nome)).toEqual(["Cards CKA"]);
  });

  it("o roadmap que saiu do catálogo aparece pela chave guardada, sem esconder o arquivamento", async () => {
    await arquivar(userId, "roadmap", "antigo", "2026-11-24T12:00:00Z");
    expect((await listarArquivadas(userId)).map((i) => i.nome)).toEqual(["Roadmap antigo"]);
  });
});
