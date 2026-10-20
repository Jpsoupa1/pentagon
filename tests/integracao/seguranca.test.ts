import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { events } from "@/server/db/schema";
import { EntradaInvalida } from "@/server/erros";
import { semearSeguranca } from "@/server/estudos/seguranca";
import { ocorrencias } from "@/server/servicos/agenda";
import { mudarFase, obterTrilhaSeguranca, sessoesPendentes } from "@/server/servicos/estudos";
import { AGORA, apagarUsuarioDeTeste, usuarioDeTeste } from "./apoio";

let userId: string;

beforeEach(async () => {
  userId = await usuarioDeTeste();
});

afterAll(apagarUsuarioDeTeste);

describe("trilha de Segurança", () => {
  it("o seed registra as fases e cria as sessões semanais uma vez só", async () => {
    expect(await semearSeguranca(db(), userId, AGORA)).toEqual({ criada: true });
    const t = (await obterTrilhaSeguranca(userId))!;
    expect(t.faseAtual).toBe(1);
    expect(t.fim).toBeNull();
    expect(t.fases).toHaveLength(4);
    expect(t.sessoes.map((s) => s.diasSemana)).toEqual([[5], [6], [0]]);

    await mudarFase(userId, "seguranca", 2);
    expect(await semearSeguranca(db(), userId, AGORA)).toEqual({ criada: false });
    const depois = (await obterTrilhaSeguranca(userId))!;
    expect(depois.faseAtual).toBe(2);
    expect(depois.sessoes).toHaveLength(3);
  });

  it("as sessões aparecem na agenda da semana sem virar pendência", async () => {
    await semearSeguranca(db(), userId, AGORA);
    const semana = await ocorrencias(userId, { de: "2026-10-19", ate: "2026-10-25" });
    const seg = semana.filter((o) => o.titulo.startsWith("Segurança e SecOps"));
    expect(seg.map((o) => o.dataOriginal)).toEqual(["2026-10-23", "2026-10-24", "2026-10-25"]);
    expect(seg.every((o) => o.origem === "evento" && o.areaId === "estudos")).toBe(true);

    const pendentes = await sessoesPendentes(userId, "2026-10-26", 50);
    expect(pendentes.lista.some((s) => s.conteudo.includes("Segurança"))).toBe(false);
  });

  it("muda de fase só para fases que existem e só em trilha sem datas", async () => {
    await semearSeguranca(db(), userId, AGORA);
    await expect(mudarFase(userId, "seguranca", 5)).rejects.toBeInstanceOf(EntradaInvalida);
    await expect(mudarFase(userId, "devops", 2)).rejects.toThrow("não encontrado");
    expect(await mudarFase(userId, "seguranca", 4)).toEqual({ slug: "seguranca", faseAtual: 4 });
  });

  it("apagar uma sessão pela agenda não faz o seed recriá-la", async () => {
    await semearSeguranca(db(), userId, AGORA);
    const t = (await obterTrilhaSeguranca(userId))!;
    await db().delete(events).where(eq(events.id, t.sessoes[2].id));
    await semearSeguranca(db(), userId, AGORA);
    expect((await obterTrilhaSeguranca(userId))!.sessoes).toHaveLength(2);
  });
});
