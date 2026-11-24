import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/server/db";
import { notifications, planoBlocos, planoProgresso, users } from "@/server/db/schema";
import { semearCatalogoPlano } from "@/server/plano/seed";
import { atualizarAjustes } from "@/server/servicos/ajustes";
import {
  dispararAviso,
  reconciliarAvisos,
  reconciliarTodos,
  salvarInscricao,
} from "@/server/servicos/avisos";
import { iniciarPlano, marcarBloco, responderFolga, trocarBloco } from "@/server/servicos/plano";
import { AGORA, apagarUsuarioDeTeste, EMAIL, usuarioDeTeste } from "./apoio";

const push = vi.hoisted(() => ({ enviar: vi.fn(async () => "ok" as const) }));
vi.mock("@/server/avisos/push", () => ({ enviarPush: push.enviar }));

// Sem QStash: o agendador falso deixa o teste do cron provocar um erro no meio do laço.
const agendamento = vi.hoisted(() => ({
  agendar: vi.fn<(id: string, quando: Date) => Promise<string | null>>(async () => null),
}));
vi.mock("@/server/avisos/agendador", () => ({
  criarAgendador: () => ({ ativo: false, agendar: agendamento.agendar, cancelar: async () => {} }),
}));

const AMIGO = "amigo-avisos-plano@pentagon.local";
const donosAntes = process.env.OWNER_EMAILS;

/** Quarta 21/10/2026, 06:00 em São Paulo: antes da pergunta (07:40) e dos blocos. */
const CEDO = new Date("2026-10-21T09:00:00Z");
const HOJE = "2026-10-21";
const SEM_AGENDADOR = { ativo: false, agendar: async () => null, cancelar: async () => {} };

let userId: string;

const iniciar = (id = userId) =>
  iniciarPlano(id, { marcados: ["A0", "C1"], incluirRequisitos: false }, AGORA);
const reconciliar = (id = userId, agora = CEDO) => reconciliarAvisos(id, agora, SEM_AGENDADOR);
const inscrever = (id = userId) =>
  salvarInscricao(id, {
    endpoint: `https://push.exemplo/${id}`,
    p256dh: "p",
    auth: "a",
    aparelho: "teste",
  });
const avisosDoPlano = async (id = userId) =>
  (await db().select().from(notifications).where(eq(notifications.userId, id)))
    .filter((a) => (a.alvoTipo === "bloco" || a.alvoTipo === "folga") && a.status === "agendada")
    .sort((a, b) => a.enviarEm.getTime() - b.enviarEm.getTime());
const doDia = async (data = HOJE) =>
  (await avisosDoPlano()).filter((a) => a.alvoId.startsWith(data));
const porAlvo = async (alvoTipo: "bloco" | "folga", alvoId: string) => {
  const [a] = await db()
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.alvoTipo, alvoTipo),
        eq(notifications.alvoId, alvoId),
      ),
    );
  return a;
};

beforeAll(async () => {
  process.env.OWNER_EMAILS = EMAIL;
  await semearCatalogoPlano(db());
});

beforeEach(async () => {
  process.env.OWNER_EMAILS = EMAIL;
  push.enviar.mockClear();
  agendamento.agendar.mockClear();
  userId = await usuarioDeTeste();
  await inscrever();
});

afterAll(async () => {
  await apagarUsuarioDeTeste();
  await db().delete(users).where(eq(users.email, AMIGO));
  if (donosAntes === undefined) delete process.env.OWNER_EMAILS;
  else process.env.OWNER_EMAILS = donosAntes;
});

describe("avisos do plano: agendamento", () => {
  it("dono com plano iniciado: pergunta da folga às 07:40 e avisos de Teoria e Projeto, sem a manhã", async () => {
    await iniciar();
    await reconciliar();
    const [folga, teoria, projeto] = await doDia();
    expect(folga).toMatchObject({
      alvoTipo: "folga",
      alvoId: HOJE,
      titulo: "Hoje tem folga no estágio?",
      corpo: "Toque para responder. Na manhã: B1. Building with the Claude API",
    });
    expect(folga.enviarEm.toISOString()).toBe("2026-10-21T10:40:00.000Z");
    expect(teoria).toMatchObject({
      alvoTipo: "bloco",
      alvoId: `${HOJE}:teoria`,
      titulo: "Bloco Teoria às 13:30",
      corpo: "A1. Álgebra linear",
    });
    expect(teoria.enviarEm.toISOString()).toBe("2026-10-21T16:25:00.000Z");
    expect(projeto).toMatchObject({ alvoId: `${HOJE}:projeto`, titulo: "Bloco Projeto às 17:20" });
    expect(projeto.enviarEm.toISOString()).toBe("2026-10-21T20:15:00.000Z");
    expect((await doDia()).map((a) => a.alvoId)).not.toContain(`${HOJE}:manha`);
  });

  it("bloco de fim de semana ligado em Ajustes também tem aviso", async () => {
    await iniciar();
    await atualizarAjustes(userId, {
      blocosPlano: { sabado: { teoria: { ligado: true, inicio: "10:00", minutos: 60 } } },
    });
    await reconciliar(userId, new Date("2026-10-23T09:00:00Z"));
    const [teoria] = await doDia("2026-10-24");
    expect(teoria).toMatchObject({ alvoTipo: "bloco", titulo: "Bloco Teoria às 10:00" });
    expect(teoria.enviarEm.toISOString()).toBe("2026-10-24T12:55:00.000Z");
  });

  it("folga respondida: não agenda e cancela a pergunta já agendada", async () => {
    await iniciar();
    await reconciliar();
    expect(await porAlvo("folga", HOJE)).toMatchObject({ status: "agendada" });
    await responderFolga(userId, { minutos: 0 }, CEDO);
    await reconciliar();
    expect(await porAlvo("folga", HOJE)).toMatchObject({ status: "cancelada" });
    expect((await doDia()).map((a) => a.alvoTipo)).toEqual(["bloco", "bloco"]);
  });

  it("bloco feito: não agenda e cancela o aviso já agendado", async () => {
    await iniciar();
    await reconciliar();
    await marcarBloco(userId, "teoria", { feito: true, minutos: 30 }, CEDO);
    await reconciliar();
    expect(await porAlvo("bloco", `${HOJE}:teoria`)).toMatchObject({ status: "cancelada" });
    expect((await doDia()).map((a) => a.alvoId)).toEqual([HOJE, `${HOJE}:projeto`]);
  });

  it("antes da primeira abertura não há aviso do plano", async () => {
    await reconciliar();
    expect(await avisosDoPlano()).toEqual([]);
  });

  it("quem não é dono não recebe", async () => {
    const [amigo] = await db().insert(users).values({ name: AMIGO, email: AMIGO }).returning();
    await inscrever(amigo.id);
    await reconciliar(amigo.id);
    expect(await avisosDoPlano(amigo.id)).toEqual([]);
  });

  it("sem estudos em areasNoFeed não há aviso do plano", async () => {
    await iniciar();
    await atualizarAjustes(userId, { areasNoFeed: ["aulas"] });
    await reconciliar();
    expect(await avisosDoPlano()).toEqual([]);
  });

  it("a antecedência vem de aviso_blocos_min", async () => {
    await iniciar();
    await atualizarAjustes(userId, { avisoBlocosMin: 10 });
    await reconciliar();
    const teoria = await porAlvo("bloco", `${HOJE}:teoria`);
    expect(teoria.enviarEm.toISOString()).toBe("2026-10-21T16:20:00.000Z");
  });
});

describe("avisos do plano: disparo", () => {
  it("recalcula o conteúdo no envio: com A1 concluído depois do agendamento, o aviso sai com A2", async () => {
    await iniciar();
    await reconciliar();
    const aviso = await porAlvo("bloco", `${HOJE}:teoria`);
    expect(aviso.corpo).toBe("A1. Álgebra linear");
    await db().insert(planoProgresso).values({ userId, codigo: "A1", concluidoEm: AGORA });

    const r = await dispararAviso(aviso.id, CEDO);
    expect(r.enviado).toBe(true);
    expect(push.enviar).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        titulo: "Bloco Teoria às 13:30",
        corpo: expect.stringMatching(/^A2\. /),
        url: "/",
      }),
    );
    expect((await porAlvo("bloco", `${HOJE}:teoria`)).status).toBe("enviada");
  });

  it("a troca do bloco antes do disparo vale no envio", async () => {
    await iniciar();
    await reconciliar();
    await trocarBloco(userId, "teoria", { escolha: "cards" }, CEDO);
    await dispararAviso((await porAlvo("bloco", `${HOJE}:teoria`)).id, CEDO);
    expect(push.enviar).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ corpo: "Cards e Cerebro" }),
    );
  });

  it("aviso que deixou de valer vira cancelado, sem envio: bloco feito, folga respondida e estudos fora", async () => {
    await iniciar();
    await reconciliar();
    const teoria = await porAlvo("bloco", `${HOJE}:teoria`);
    const projeto = await porAlvo("bloco", `${HOJE}:projeto`);
    const folga = await porAlvo("folga", HOJE);

    await marcarBloco(userId, "teoria", { feito: true, minutos: 30 }, CEDO);
    expect(await dispararAviso(teoria.id, CEDO)).toMatchObject({ enviado: false });
    await responderFolga(userId, { minutos: 60 }, CEDO);
    expect(await dispararAviso(folga.id, CEDO)).toMatchObject({ enviado: false });
    await atualizarAjustes(userId, { areasNoFeed: ["aulas"] });
    expect(await dispararAviso(projeto.id, CEDO)).toMatchObject({ enviado: false });

    expect(push.enviar).not.toHaveBeenCalled();
    expect((await porAlvo("bloco", teoria.alvoId)).status).toBe("cancelada");
    expect((await porAlvo("bloco", projeto.alvoId)).status).toBe("cancelada");
    expect((await porAlvo("folga", folga.alvoId)).status).toBe("cancelada");
  });

  it("conta que deixou de ser dona não recebe o aviso agendado", async () => {
    await iniciar();
    await reconciliar();
    const aviso = await porAlvo("bloco", `${HOJE}:teoria`);
    process.env.OWNER_EMAILS = "outro@pentagon.local";
    try {
      expect(await dispararAviso(aviso.id, CEDO)).toMatchObject({ enviado: false });
    } finally {
      process.env.OWNER_EMAILS = EMAIL;
    }
    expect((await porAlvo("bloco", aviso.alvoId)).status).toBe("cancelada");
    expect(push.enviar).not.toHaveBeenCalled();
  });
});

describe("avisos do plano: vários donos e manhã trocada", () => {
  async function segundoDono() {
    await db().delete(users).where(eq(users.email, AMIGO));
    const [b] = await db().insert(users).values({ name: AMIGO, email: AMIGO }).returning();
    process.env.OWNER_EMAILS = `${EMAIL},${AMIGO}`;
    await iniciar(b.id);
    await inscrever(b.id);
    return b.id;
  }
  const linhas = async (id: string, tipo: "folga" | "bloco") =>
    (await db().select().from(notifications).where(eq(notifications.userId, id))).filter(
      (a) => a.alvoTipo === tipo,
    );

  it("dois donos com o mesmo horário: cada um fica com a própria linha, e B não mexe na de A", async () => {
    const b = await segundoDono();
    await iniciar();
    await reconciliar();
    await responderFolga(userId, { minutos: 0 }, CEDO);
    await reconciliar();
    const [antes] = (await linhas(userId, "folga")).filter((a) => a.alvoId === HOJE);
    expect(antes.status).toBe("cancelada");

    await reconciliar(b);
    const [deB] = (await linhas(b, "folga")).filter((a) => a.alvoId === HOJE);
    expect(deB).toMatchObject({ status: "agendada", alvoId: HOJE });
    expect(deB.id).not.toBe(antes.id);
    const [depois] = (await linhas(userId, "folga")).filter((a) => a.alvoId === HOJE);
    expect(depois).toMatchObject({
      id: antes.id,
      status: "cancelada",
      titulo: antes.titulo,
      corpo: antes.corpo,
    });
    expect((await linhas(userId, "bloco")).length).toBe(4);
    expect((await linhas(b, "bloco")).length).toBe(4);
  });

  it("a manhã trocada para Cards e Cerebro aparece no corpo da pergunta, no agendamento e no envio", async () => {
    await iniciar();
    await db()
      .insert(planoBlocos)
      .values({ userId, data: HOJE, bloco: "manha", escolha: "cards", minutos: 0 });
    await reconciliar();
    const folga = await porAlvo("folga", HOJE);
    expect(folga.corpo).toBe("Toque para responder. Na manhã: Cards e Cerebro");
    await dispararAviso(folga.id, CEDO);
    expect(push.enviar).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ corpo: "Toque para responder. Na manhã: Cards e Cerebro" }),
    );
  });

  it("cron: o erro de um usuário não impede a reconciliação do seguinte", async () => {
    const b = await segundoDono();
    await iniciar();
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    agendamento.agendar.mockRejectedValueOnce(new Error("QStash fora"));
    try {
      await reconciliarTodos(CEDO);
      expect(erro).toHaveBeenCalledTimes(1);
      // Só o id do usuário vai para o log, nunca o conteúdo dos avisos.
      expect(erro.mock.calls[0].slice(0, 2)).toEqual([
        "Reconciliar avisos falhou para o usuário",
        expect.stringMatching(/^[0-9a-f-]{36}$/),
      ]);
    } finally {
      erro.mockRestore();
    }
    const total = [
      (await linhas(userId, "bloco")).length + (await linhas(userId, "folga")).length,
      (await linhas(b, "bloco")).length + (await linhas(b, "folga")).length,
    ];
    // Quem falhou parou no primeiro aviso; o outro foi reconciliado inteiro (3 avisos por dia, hoje e amanhã).
    expect(total.sort((x, y) => x - y)).toEqual([1, 6]);
  });
});
