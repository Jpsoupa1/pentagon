import { and, eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { eventExceptions, events, studyTracks } from "@/server/db/schema";
import { semearSeguranca } from "@/server/estudos/seguranca";
import { ocorrencias } from "@/server/servicos/agenda";
import { obterTrilhaSeguranca } from "@/server/servicos/estudos";
import { horaLocal } from "@/lib/tempo";
import { AGORA, apagarUsuarioDeTeste, usuarioDeTeste } from "./apoio";

let userId: string;

beforeEach(async () => {
  userId = await usuarioDeTeste();
});

afterAll(apagarUsuarioDeTeste);

const semana = (de: string, ate: string) => ocorrencias(userId, { de, ate });
const resumo = (lista: Awaited<ReturnType<typeof semana>>, fuso = "America/Sao_Paulo") =>
  lista
    .filter((o) => o.areaId === "estudos" && horaLocal(o.inicio, fuso) === "14:00")
    .map((o) => `${o.dataOriginal} ${o.origem === "evento" ? "SEG" : "DEVOPS"}`)
    .sort();

describe("trilha Segurança na agenda", () => {
  it("o seed grava as datas da trilha e três sessões: terça, quinta e sábado às 14:00", async () => {
    expect(await semearSeguranca(db(), userId, AGORA)).toEqual({ criada: true, migrada: false });
    const t = (await obterTrilhaSeguranca(userId))!;
    expect([t.inicio, t.fim, t.faseAtual]).toEqual(["2026-10-19", "2027-10-24", null]);
    expect(t.fases.map((f) => f.curto)).toEqual(["Fundamentos", "SecOps", "Ofensiva", "Security+"]);
    expect(t.sessoes.flatMap((s) => s.diasSemana ?? []).sort()).toEqual([2, 4, 6]);

    // Rodar de novo (deploy) não recria nem duplica nada.
    expect(await semearSeguranca(db(), userId, AGORA)).toEqual({ criada: false, migrada: false });
    expect((await obterTrilhaSeguranca(userId))!.sessoes).toHaveLength(3);
  });

  it("nas semanas compartilhadas, a tarde de terça e quinta é da Segurança", async () => {
    await semearSeguranca(db(), userId, AGORA);
    expect(resumo(await semana("2026-11-09", "2026-11-15"))).toEqual([
      "2026-11-09 DEVOPS",
      "2026-11-10 SEG",
      "2026-11-11 DEVOPS",
      "2026-11-12 SEG",
      "2026-11-14 SEG",
    ]);
  });

  it("nas pausas, a tarde volta para a DevOps e o sábado da Segurança continua", async () => {
    await semearSeguranca(db(), userId, AGORA);
    expect(resumo(await semana("2026-11-02", "2026-11-08"))).toEqual([
      "2026-11-02 DEVOPS",
      "2026-11-03 DEVOPS",
      "2026-11-04 DEVOPS",
      "2026-11-05 DEVOPS",
      "2026-11-07 SEG",
    ]);
    const canceladas = await db()
      .select({ data: eventExceptions.data, motivo: eventExceptions.motivo })
      .from(eventExceptions)
      .where(eq(eventExceptions.userId, userId));
    expect(canceladas).toContainEqual({ data: "2027-02-16", motivo: "Pausa: Pausa CKA" });
    expect(canceladas.some((c) => c.data === "2026-11-07")).toBe(false);
  });

  it("troca a versão antiga (sem datas, 17:45 e sexta) pela nova uma vez só", async () => {
    const [antiga] = await db()
      .insert(studyTracks)
      .values({
        userId,
        slug: "seguranca",
        nome: "Segurança e SecOps",
        inicio: "2026-10-20",
        fim: null,
        faseAtual: 2,
      })
      .returning();
    await db()
      .insert(events)
      .values({
        userId,
        trackId: antiga.id,
        titulo: "Segurança e SecOps",
        areaId: "estudos",
        inicio: new Date("2026-10-23T17:00:00Z"),
        duracaoMin: 90,
        diasSemana: [5],
        repeteDesde: "2026-10-23",
      });
    expect(await semearSeguranca(db(), userId, AGORA)).toEqual({ criada: false, migrada: true });
    const t = (await obterTrilhaSeguranca(userId))!;
    expect(t.id).toBe(antiga.id);
    expect([t.fim, t.faseAtual]).toEqual(["2027-10-24", null]);
    expect(t.sessoes.flatMap((s) => s.diasSemana ?? []).sort()).toEqual([2, 4, 6]);
  });

  it("apagar uma sessão pela agenda não faz o seed recriá-la", async () => {
    await semearSeguranca(db(), userId, AGORA);
    const t = (await obterTrilhaSeguranca(userId))!;
    await db()
      .delete(events)
      .where(and(eq(events.id, t.sessoes[2].id), eq(events.userId, userId)));
    await semearSeguranca(db(), userId, AGORA);
    expect((await obterTrilhaSeguranca(userId))!.sessoes).toHaveLength(2);
  });
});
