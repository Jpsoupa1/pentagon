import { and, eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { eventExceptions, events, studyTracks } from "@/server/db/schema";
import { semearTrilha } from "@/server/estudos/seed";
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

const FUSO = "America/Sao_Paulo";
const dia = async (data: string) =>
  (await ocorrencias(userId, { de: data, ate: data })).filter((o) => !o.diaInteiro);
const linha = (lista: Awaited<ReturnType<typeof dia>>) =>
  lista.map((o) => `${horaLocal(o.inicio, FUSO)}-${horaLocal(o.fim, FUSO)} ${o.titulo}`);

describe("trilha Segurança na agenda", () => {
  it("o seed grava as datas da trilha e um bloco de segunda a sexta, 17:30 às 18:40", async () => {
    expect(await semearSeguranca(db(), userId, AGORA)).toEqual({ criada: true, migrada: false });
    const t = (await obterTrilhaSeguranca(userId))!;
    expect([t.nome, t.inicio, t.fim, t.faseAtual]).toEqual([
      "Segurança e SecOps",
      "2026-10-20",
      "2027-10-24",
      null,
    ]);
    expect(t.fases.map((f) => f.curto)).toEqual(["Fundamentos", "SecOps", "Ofensiva", "Security+"]);
    expect(t.sessoes).toHaveLength(1);
    const [bloco] = t.sessoes;
    expect([
      bloco.titulo,
      bloco.diasSemana,
      horaLocal(bloco.inicio, FUSO),
      bloco.duracaoMin,
    ]).toEqual(["Ciber e SecOps", [1, 2, 3, 4, 5], "17:30", 70]);
    const [linhaDoBanco] = await db().select().from(events).where(eq(events.id, bloco.id));
    expect([linhaDoBanco.fuso, linhaDoBanco.repeteDesde, linhaDoBanco.repeteAte]).toEqual([
      FUSO,
      "2026-10-21",
      null,
    ]);

    // Rodar de novo (deploy) não recria nem duplica nada.
    expect(await semearSeguranca(db(), userId, AGORA)).toEqual({ criada: false, migrada: false });
    expect((await obterTrilhaSeguranca(userId))!.sessoes).toHaveLength(1);
  });

  it("terça da semana que vem: CKA às 14:00, academia, Ciber e SecOps com a tarefa e aula", async () => {
    await semearTrilha(db(), userId);
    await semearSeguranca(db(), userId, AGORA);
    const terca = (await dia("2026-10-27")).filter((o) => o.areaId !== "estagio" && !o.noEstagio);
    expect(linha(terca)).toEqual([
      "14:00-15:30 Drill: criar tudo por comando imperativo com $do; refazer o seletor imutável do ReplicaSet (lacuna)",
      "16:00-17:30 Academia",
      "17:30-18:40 Ciber e SecOps",
      "19:10-22:00 Análise e Projeto de Sistemas",
    ]);
    expect(terca[2].detalhe).toBe("Bandit, níveis 4 a 6");
    // Nenhum bloco da tarde e da noite se sobrepõe a outro.
    for (let i = 1; i < terca.length; i++) {
      expect(terca[i].inicio >= terca[i - 1].fim, linha(terca)[i]).toBe(true);
    }
  });

  it("sábado da semana que vem não tem estudo à tarde, e sexta tem a reposição da CKA", async () => {
    await semearTrilha(db(), userId);
    await semearSeguranca(db(), userId, AGORA);
    const sabado = await dia("2026-10-31");
    expect(
      sabado.filter((o) => o.areaId === "estudos" && horaLocal(o.inicio, FUSO) >= "12:00"),
    ).toEqual([]);
    const sexta = linha((await dia("2026-10-30")).filter((o) => o.areaId === "estudos"));
    expect(sexta).toContain("14:00-15:30 Reposição do que atrasou");
    expect(sexta).toContain("17:30-18:40 Ciber e SecOps");
  });

  it("nas semanas leves o bloco continua na agenda (as pausas são só informação)", async () => {
    await semearTrilha(db(), userId);
    await semearSeguranca(db(), userId, AGORA);
    const leve = await dia("2027-02-16");
    const bloco = leve.find((o) => o.titulo === "Ciber e SecOps")!;
    expect(bloco.detalhe).toBe("Livre: foco na CKA");
    expect(leve.some((o) => o.areaId === "estudos" && horaLocal(o.inicio, FUSO) === "14:00")).toBe(
      true,
    );
    const excecoes = await db()
      .select()
      .from(eventExceptions)
      .where(eq(eventExceptions.userId, userId));
    expect(excecoes).toEqual([]);
  });

  it("troca as sessões semanais (terça, quinta e sábado às 14:00) pelo bloco diário uma vez só", async () => {
    const [trilha] = await db()
      .insert(studyTracks)
      .values({
        userId,
        slug: "seguranca",
        nome: "Segurança e SecOps",
        inicio: "2026-10-19",
        fim: "2027-10-24",
      })
      .returning();
    const antigas = await db()
      .insert(events)
      .values(
        [2, 4, 6].map((d) => ({
          userId,
          trackId: trilha.id,
          titulo: "Segurança e SecOps",
          areaId: "estudos" as const,
          inicio: new Date(`2026-10-${18 + d}T17:00:00Z`),
          duracaoMin: d === 6 ? 120 : 90,
          diasSemana: [d],
          repeteDesde: `2026-10-${18 + d}`,
          repeteAte: "2027-10-24",
        })),
      )
      .returning({ id: events.id });
    await db().insert(eventExceptions).values({
      userId,
      eventId: antigas[0].id,
      data: "2027-02-16",
      tipo: "cancelada",
      motivo: "Pausa: Pausa CKA",
    });

    expect(await semearSeguranca(db(), userId, AGORA)).toEqual({ criada: false, migrada: true });
    const t = (await obterTrilhaSeguranca(userId))!;
    expect(t.id).toBe(trilha.id);
    expect(t.sessoes.map((s) => [s.titulo, s.diasSemana])).toEqual([
      ["Ciber e SecOps", [1, 2, 3, 4, 5]],
    ]);
    const excecoes = await db()
      .select()
      .from(eventExceptions)
      .where(eq(eventExceptions.userId, userId));
    expect(excecoes).toEqual([]);

    expect(await semearSeguranca(db(), userId, AGORA)).toEqual({ criada: false, migrada: false });
    expect((await obterTrilhaSeguranca(userId))!.sessoes).toHaveLength(1);
  });

  it("troca a versão sem datas (17:45 e sexta) pelo bloco diário", async () => {
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
    expect([t.fim, t.faseAtual]).toEqual(["2027-10-24", null]);
    expect(t.sessoes.map((s) => s.diasSemana)).toEqual([[1, 2, 3, 4, 5]]);
  });

  it("apagar o bloco pela agenda não faz o seed recriá-lo", async () => {
    await semearSeguranca(db(), userId, AGORA);
    const t = (await obterTrilhaSeguranca(userId))!;
    await db()
      .delete(events)
      .where(and(eq(events.id, t.sessoes[0].id), eq(events.userId, userId)));
    expect(await semearSeguranca(db(), userId, AGORA)).toEqual({ criada: false, migrada: false });
    expect((await obterTrilhaSeguranca(userId))!.sessoes).toHaveLength(0);
  });
});
