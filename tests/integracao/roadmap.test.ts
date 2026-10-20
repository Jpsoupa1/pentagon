import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/server/db";
import { studySessions, users } from "@/server/db/schema";
import { requisitosDaTrilha, semearRoadmap } from "@/server/roadmap/seed";
import { obterRoadmap } from "@/server/servicos/roadmap";
import { AGORA, apagarUsuarioDeTeste, usuarioDeTeste } from "./apoio";

// A sessão das rotas vem deste mock: cada teste diz quem está logado.
const sessao = vi.hoisted(() => ({ userId: "" }));
vi.mock("@/server/auth", () => ({ auth: async () => ({ user: { id: sessao.userId } }) }));

const { PATCH } = await import("@/app/api/trilhas/[slug]/roadmap/requisitos/[id]/route");
const { POST } = await import("@/app/api/trilhas/[slug]/roadmap/pratica/[id]/route");
const { GET } = await import("@/app/api/trilhas/[slug]/roadmap/route");

const OUTRO = "roadmap-outro@pentagon.local";
let eu: string;
let outro: string;

function pedido(corpo: unknown) {
  return new Request("http://localhost/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  }) as unknown as NextRequest;
}
const ctx = (slug: string, id: string) => ({ params: Promise.resolve({ slug, id }) });

async function praticaPorTitulo(userId: string, titulo: string, fase = 0) {
  const r = await obterRoadmap(userId, "devops", AGORA);
  return r.fases[fase].pratica.find((p) => p.titulo === titulo)!;
}

beforeEach(async () => {
  eu = await usuarioDeTeste();
  await db().delete(users).where(eq(users.email, OUTRO));
  [{ id: outro }] = await db().insert(users).values({ email: OUTRO }).returning();
  await semearRoadmap(db(), [eu, outro]);
});

afterAll(async () => {
  await db().delete(users).where(eq(users.email, OUTRO));
  await apagarUsuarioDeTeste();
});

describe("Roadmap", () => {
  it("o seed grava a trilha e marca os requisitos 'done' só na primeira vez", async () => {
    const r = await obterRoadmap(eu, "devops", AGORA);
    expect(r.fases.map((f) => f.portao)).toEqual(["CKA", "AWS SAA", "Terraform", "Projeto 3"]);
    expect(r.atual).toBe(0);
    expect(r.inicio).toEqual({ tipo: "aqui" });
    expect(r.trilha.numeros).toContain("19 h por semana");
    expect(r.trilhas.map((t) => t.slug)).toEqual(["devops", "seguranca"]);
    // Meta da bateria pelo calendário: as tardes de segunda a quinta (a reposição de sexta não conta).
    expect(r.fases[0].pratica[0].meta).toBe(76);
    expect(r.fases[0].requisitos.filter((x) => x.feito)).toHaveLength(2);
    expect((await praticaPorTitulo(eu, "Sábados do Projeto 1 (BookStack)")).manual).toBe(1);
    expect(r.fases[3].avaliacoes.at(-1)).toMatchObject({ data: null, opcional: true });

    // Desmarcar e rodar o seed de novo (deploy) não marca outra vez.
    const [primeiro] = await requisitosDaTrilha(db(), "devops");
    sessao.userId = eu;
    await PATCH(pedido({ feito: false }), ctx("devops", primeiro.id));
    await semearRoadmap(db(), [eu]);
    const depois = await obterRoadmap(eu, "devops", AGORA);
    expect(depois.fases[0].requisitos[0].feito).toBe(false);
    expect(depois.fases[0].requisitos).toHaveLength(14);
  });

  it("PATCH marca o requisito só para quem está logado", async () => {
    const reqs = await requisitosDaTrilha(db(), "devops");
    const alvo = reqs.find((x) => x.rotulo === "Security e RBAC")!;

    sessao.userId = outro;
    const r = await PATCH(pedido({ feito: true }), ctx("devops", alvo.id));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ id: alvo.id, feito: true });

    const meu = await obterRoadmap(eu, "devops", AGORA);
    const dele = await obterRoadmap(outro, "devops", AGORA);
    expect(meu.fases[0].requisitos.find((x) => x.id === alvo.id)!.feito).toBe(false);
    expect(dele.fases[0].requisitos.find((x) => x.id === alvo.id)!.feito).toBe(true);

    // GET devolve o progresso de quem pediu.
    sessao.userId = eu;
    const g = await (await GET(pedido({}), { params: Promise.resolve({ slug: "devops" }) })).json();
    expect(g.fases[0].requisitos.find((x: { id: string }) => x.id === alvo.id).feito).toBe(false);
  });

  it("PATCH recusa id de outra trilha, id inválido e corpo errado", async () => {
    const [req] = await requisitosDaTrilha(db(), "devops");
    sessao.userId = eu;
    expect((await PATCH(pedido({ feito: true }), ctx("seguranca", req.id))).status).toBe(404);
    expect((await PATCH(pedido({ feito: true }), ctx("devops", "nao-e-uuid"))).status).toBe(400);
    expect((await PATCH(pedido({ feito: "sim" }), ctx("devops", req.id))).status).toBe(400);
  });

  it("POST soma e desfaz a prática de quem está logado, sem ficar negativo", async () => {
    const drills = await praticaPorTitulo(eu, "Drills das lacunas");
    sessao.userId = eu;
    expect(await (await POST(pedido({ delta: 1 }), ctx("devops", drills.id))).json()).toEqual({
      id: drills.id,
      manual: 1,
    });
    await POST(pedido({ delta: 1 }), ctx("devops", drills.id));

    sessao.userId = outro;
    await POST(pedido({ delta: -1 }), ctx("devops", drills.id));
    expect((await praticaPorTitulo(outro, "Drills das lacunas")).manual).toBe(0);
    expect((await praticaPorTitulo(eu, "Drills das lacunas")).manual).toBe(2);

    expect((await POST(pedido({ delta: 5 }), ctx("devops", drills.id))).status).toBe(400);
  });

  it("Segurança: semanas leves ligadas à DevOps, portão de marco e fase atual numa delas", async () => {
    const r = await obterRoadmap(eu, "seguranca", AGORA);
    expect(r.trilha.icone).toBe("escudo");
    expect(r.pausas.map((p) => [p.rotulo, p.trilhaLigada?.slug])).toEqual([
      ["Semanas leves da CKA", "devops"],
      ["Semanas leves da AWS SAA", "devops"],
      ["Semanas leves do Terraform", "devops"],
    ]);
    expect(r.fases.map((f) => f.portaoData)).toEqual([
      "2027-02-12",
      "2027-05-14",
      "2027-07-16",
      "2027-10-22",
    ]);
    expect(r.fases[0].portaoTipo).toBe("milestone");
    expect(r.fases[0].requisitos.every((x) => !x.feito)).toBe(true);
    expect(r.inicio).toEqual({ tipo: "aqui" });
    // 20/02/2027: semanas leves da CKA, depois do fim da Fase 1 — a Fase 1 continua atual.
    const pausa = await obterRoadmap(eu, "seguranca", new Date("2027-02-20T15:00:00Z"));
    expect(pausa.atual).toBe(0);
    const depois = await obterRoadmap(eu, "seguranca", new Date("2027-03-08T15:00:00Z"));
    expect(depois.atual).toBe(1);
  });

  it("os contadores ligados somam sozinhos as sessões de prática feitas na fase", async () => {
    await db()
      .update(studySessions)
      .set({ status: "feita" })
      .where(and(eq(studySessions.userId, eu), eq(studySessions.data, "2026-10-27")));
    const bateria = await praticaPorTitulo(eu, "Bateria de 10 exercícios na tarde");
    expect(bateria.fonte).toBe("sessoes:pratica");
    expect(bateria.automatico).toBe(1);
    // Fora do período da fase 2, não conta lá.
    expect((await praticaPorTitulo(eu, "Bateria de 10 exercícios na tarde", 1)).automatico).toBe(0);
    // E não aparece para outro usuário.
    expect((await praticaPorTitulo(outro, "Bateria de 10 exercícios na tarde")).automatico).toBe(0);
  });
});
