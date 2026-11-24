import { readFileSync } from "node:fs";
import { and, eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eventoSchema } from "@/lib/validacao";
import { addDias, diaDaSemana, hojeLocal, horaLocal } from "@/lib/tempo";
import { db } from "@/server/db";
import {
  events,
  notifications,
  planoFolgas,
  planoProgresso,
  settings,
  users,
} from "@/server/db/schema";
import { Conflito } from "@/server/erros";
import { semearCatalogoPlano } from "@/server/plano/seed";
import { ocorrencias } from "@/server/servicos/agenda";
import { atualizarAjustes, obterAjustes } from "@/server/servicos/ajustes";
import { reconciliarAvisos, salvarInscricao } from "@/server/servicos/avisos";
import { blocosDoPlano, planoDeHoje } from "@/server/servicos/blocos";
import { feedPorToken, gerarToken, revogarTokens } from "@/server/servicos/calendario";
import { criarComChecagem } from "@/server/servicos/compromissos";
import { iniciarPlano, marcarBloco, responderFolga, trocarBloco } from "@/server/servicos/plano";
import { AGORA, apagarUsuarioDeTeste, EMAIL, HOJE, usuarioDeTeste } from "./apoio";

// A sessão é simulada só para exercitar a rota real de Ajustes (400 em HTTP).
const sessao = vi.hoisted(() => ({ userId: null as string | null }));
vi.mock("@/server/auth", () => ({
  auth: async () => (sessao.userId ? { user: { id: sessao.userId } } : null),
}));

const AMIGO = "amigo-blocos@pentagon.local";
const donosAntes = process.env.OWNER_EMAILS;

/** Quarta 21/10/2026: 07:40 em São Paulo, depois das 12:00 (15:00) e o sábado seguinte. */
const MANHA = new Date("2026-10-21T10:40:00Z");
const TARDE = new Date("2026-10-21T18:00:00Z");
const SABADO = "2026-10-24";
const NO_SABADO = new Date("2026-10-24T13:00:00Z");
const FUSO = "America/Sao_Paulo";

let userId: string;

const iniciar = (id = userId) =>
  iniciarPlano(id, { marcados: ["A0", "C1"], incluirRequisitos: false }, AGORA);
const hoje = (agora = MANHA, id = userId) => planoDeHoje(id, agora);
const diaDaAgenda = async (data: string, id = userId) =>
  (await ocorrencias(id, { de: data, ate: data })).filter((o) => o.origem === "bloco");
const titulos = async (data: string, id = userId) =>
  (await diaDaAgenda(data, id)).map((o) => o.titulo);

async function criarAmigo() {
  await db().delete(users).where(eq(users.email, AMIGO));
  const [u] = await db().insert(users).values({ name: AMIGO, email: AMIGO }).returning();
  return u.id;
}

async function planoIniciado() {
  const p = await hoje();
  if (!p?.iniciado) throw new Error("Plano não iniciado.");
  return p;
}

beforeAll(async () => {
  process.env.OWNER_EMAILS = EMAIL;
  await semearCatalogoPlano(db());
});

beforeEach(async () => {
  userId = await usuarioDeTeste();
  sessao.userId = null;
});

afterAll(async () => {
  await apagarUsuarioDeTeste();
  await db().delete(users).where(eq(users.email, AMIGO));
  if (donosAntes === undefined) delete process.env.OWNER_EMAILS;
  else process.env.OWNER_EMAILS = donosAntes;
});

describe("Hoje: folga e blocos", () => {
  it("antes da primeira abertura só existe o convite, e não há blocos em lugar nenhum", async () => {
    expect(await hoje()).toEqual({ iniciado: false });
    expect(await blocosDoPlano(userId, { de: HOJE, ate: HOJE })).toEqual([]);
    expect(await titulos(HOJE)).toEqual([]);
  });

  it("dia útil até 12:00 pergunta a folga; com 2 h a manhã mostra o conteúdo de Cursos; com Nada some", async () => {
    await iniciar();
    let p = await planoIniciado();
    expect(p).toMatchObject({ diaUtil: true, folga: null, perguntarFolga: true });
    expect(p.blocos.map((b) => b.bloco)).toEqual(["teoria", "projeto"]);

    await responderFolga(userId, { minutos: 120 }, MANHA);
    p = await planoIniciado();
    expect(p.folga).toBe(120);
    expect(p.blocos[0]).toMatchObject({
      bloco: "manha",
      inicio: "08:00",
      minutos: 120,
      texto: "B1. Building with the Claude API",
      destino: "/plano#trilha-cursos",
    });

    // Mudar no mesmo dia funciona, e Nada tira a manhã.
    await responderFolga(userId, { minutos: 0 }, MANHA);
    p = await planoIniciado();
    expect(p).toMatchObject({ folga: 0, perguntarFolga: true });
    expect(p.blocos.map((b) => b.bloco)).toEqual(["teoria", "projeto"]);
    await responderFolga(userId, { minutos: 60 }, TARDE);
    expect((await planoIniciado()).blocos[0]).toMatchObject({ bloco: "manha", minutos: 60 });
  });

  it("depois de 12:00 sem resposta a pergunta fecha; respondida, continua para mudar a resposta", async () => {
    await iniciar();
    expect(await hoje(TARDE)).toMatchObject({ perguntarFolga: false });
    await responderFolga(userId, { minutos: 180 }, MANHA);
    expect(await hoje(TARDE)).toMatchObject({ perguntarFolga: true, folga: 180 });
  });

  it("fim de semana não pergunta a folga e não tem blocos por padrão", async () => {
    await iniciar();
    expect(await hoje(NO_SABADO)).toMatchObject({
      diaUtil: false,
      perguntarFolga: false,
      blocos: [],
    });
  });

  it("trilha aguardando: o bloco mostra 'Aguardando' e o plano B", async () => {
    await iniciar();
    await db()
      .insert(planoProgresso)
      .values(
        ["B1", "B2", "B3", "B4", "B5"].map((codigo) => ({ userId, codigo, concluidoEm: AGORA })),
      );
    await responderFolga(userId, { minutos: 120 }, MANHA);
    const [manha] = (await planoIniciado()).blocos;
    expect(manha.texto).toBe(
      "Aguardando: B6. LLM Zoomcamp, módulos de RAG e avaliação de busca. Plano B: A1. Álgebra linear",
    );
  });

  it("fiz este bloco e troca aparecem no cartão; a troca só oferece as opções do plano", async () => {
    await iniciar();
    const { opcoesDeTroca } = await planoIniciado();
    expect(opcoesDeTroca.map((o) => o.valor)).toEqual(["item:A1", "item:B1", "item:C2", "cards"]);
    expect(opcoesDeTroca[0].texto).toBe("A1. Álgebra linear");

    await trocarBloco(userId, "projeto", { escolha: "cards" }, MANHA);
    await marcarBloco(userId, "teoria", { feito: true, minutos: 45 }, MANHA);
    const p = await planoIniciado();
    expect(p.blocos).toMatchObject([
      { bloco: "teoria", feito: true, minutosFeitos: 45, texto: "A1. Álgebra linear" },
      { bloco: "projeto", feito: false, texto: "Cards e Cerebro", destino: "/plano" },
    ]);
  });

  it("marcar ou trocar um bloco que não existe hoje é recusado: manhã sem folga, fim de semana desligado", async () => {
    await iniciar();
    const recusado = async (promessa: Promise<unknown>) => {
      const erro = await promessa.catch((e: unknown) => e);
      expect(erro).toBeInstanceOf(Conflito);
      expect((erro as Conflito).motivo).toBe("bloco_fora_do_dia");
    };
    await recusado(marcarBloco(userId, "manha", { feito: true }, MANHA));
    await recusado(trocarBloco(userId, "manha", { escolha: "cards" }, MANHA));
    await recusado(marcarBloco(userId, "teoria", { feito: true }, NO_SABADO));

    await atualizarAjustes(userId, {
      blocosPlano: { sabado: { teoria: { inicio: "10:00", minutos: 60, ligado: true } } },
    });
    await marcarBloco(userId, "teoria", { feito: true }, NO_SABADO);
    const p = await planoDeHoje(userId, NO_SABADO);
    expect(p).toMatchObject({ blocos: [{ bloco: "teoria", feito: true, minutosFeitos: 60 }] });
  });
});

describe("Agenda, conflitos e Ajustes", () => {
  beforeEach(async () => {
    await iniciar();
  });

  it("Teoria e Projeto entram na Agenda como estudos, com o título do conteúdo e a Academia de 80 min não choca", async () => {
    const lista = await diaDaAgenda(HOJE);
    expect(lista.map((o) => [horaLocal(o.inicio, FUSO), horaLocal(o.fim, FUSO), o.areaId])).toEqual(
      [
        ["13:30", "15:00", "estudos"],
        ["17:20", "18:40", "estudos"],
      ],
    );
    expect(lista.map((o) => o.titulo)).toEqual([
      "Bloco Teoria: A1. Álgebra linear",
      "Bloco Projeto: C2. Pulse AI: pipeline de dados",
    ]);
    const [academia] = await db()
      .select({ inicio: events.inicio, minutos: events.duracaoMin })
      .from(events)
      .where(and(eq(events.userId, userId), eq(events.titulo, "Academia")));
    expect([horaLocal(academia.inicio, FUSO), academia.minutos]).toEqual(["16:00", 80]);
  });

  it("a manhã só aparece no dia com folga e não choca com o estágio", async () => {
    expect(await titulos(HOJE)).toHaveLength(2);
    await responderFolga(userId, { minutos: 120 }, MANHA);
    expect(await titulos(HOJE)).toHaveLength(3);
    expect(await titulos("2026-10-22")).toHaveLength(2);

    // A manhã cobre o estágio de propósito: ela pode sobrepor, e a Agenda sabe disso.
    const [manha] = await diaDaAgenda(HOJE);
    expect(manha.titulo).toMatch(/^Bloco Manhã: /);
    expect(manha.permiteSobreposicao).toBe(true);
  });

  it("um compromisso no horário da Teoria ou do Projeto dá conflito", async () => {
    const novo = (hora: string, titulo: string) =>
      eventoSchema.parse({ titulo, areaId: "pessoal", data: "2026-10-22", hora, duracaoMin: 30 });
    const erro = await criarComChecagem(userId, novo("14:00", "Dentista")).catch((e) => e);
    expect(erro).toBeInstanceOf(Conflito);
    expect(JSON.stringify((erro as Conflito).detalhes)).toContain(
      "Bloco Teoria: A1. Álgebra linear",
    );
    const outro = await criarComChecagem(userId, novo("18:00", "Reunião")).catch((e) => e);
    expect(JSON.stringify((outro as Conflito).detalhes)).toContain("Bloco Projeto: C2");
    await expect(criarComChecagem(userId, novo("15:30", "Livre"))).resolves.toBeDefined();
  });

  it("Ajustes mudam os horários da Agenda; sábado ligado vira bloco e desligado, nada", async () => {
    expect(await titulos(SABADO)).toEqual([]);
    await atualizarAjustes(userId, {
      blocosPlano: {
        dias_uteis: { teoria: { inicio: "14:00", minutos: 60 } },
        sabado: {
          teoria: { inicio: "09:00", minutos: 120, ligado: true },
          projeto: { inicio: "15:00", minutos: 90, ligado: false },
        },
      },
    });
    const [teoria] = await diaDaAgenda(HOJE);
    expect([horaLocal(teoria.inicio, FUSO), horaLocal(teoria.fim, FUSO)]).toEqual([
      "14:00",
      "15:00",
    ]);
    const sabado = await diaDaAgenda(SABADO);
    expect(
      sabado.map((o) => [o.titulo, horaLocal(o.inicio, FUSO), horaLocal(o.fim, FUSO)]),
    ).toEqual([["Bloco Teoria: A1. Álgebra linear", "09:00", "11:00"]]);
    expect(await titulos("2026-10-25")).toEqual([]);
  });

  it("Ajustes com horário 25:00 ou minutos 0 e 500 dão 400 na rota", async () => {
    const { PATCH } = await import("@/app/api/ajustes/route");
    const patch = (corpo: unknown) =>
      PATCH(
        new NextRequest("http://localhost/api/ajustes", {
          method: "PATCH",
          body: JSON.stringify(corpo),
        }),
        { params: Promise.resolve({}) },
      );
    sessao.userId = userId;
    const teoria = (t: object) => ({ blocosPlano: { dias_uteis: { teoria: t } } });
    expect((await patch(teoria({ inicio: "25:00", minutos: 90 }))).status).toBe(400);
    expect((await patch(teoria({ inicio: "13:30", minutos: 0 }))).status).toBe(400);
    expect((await patch(teoria({ inicio: "13:30", minutos: 500 }))).status).toBe(400);
    expect((await patch({ perguntaFolga: "25:00" })).status).toBe(400);
    // O 200 não passa por aqui: a rota agenda a reconciliação dos avisos fora de uma requisição real.
    const [ajustes] = await db().select().from(settings).where(eq(settings.userId, userId));
    expect(ajustes.blocosPlano).toBeNull();
  });
});

describe("calendário ICS", () => {
  it("o feed do dono traz os blocos com o título do conteúdo; a manhã só no dia com folga", async () => {
    await iniciar();
    // Um dia útil depois de hoje, dentro da janela do feed (a folga só se responde no próprio dia).
    let dia = addDias(hojeLocal(new Date(), FUSO), 1);
    while ([0, 6].includes(diaDaSemana(dia))) dia = addDias(dia, 1);
    await db().insert(planoFolgas).values({ userId, data: dia, minutos: 120 });
    const { token } = await gerarToken(userId);
    const ics = (await feedPorToken(token))!;
    expect(ics).toContain("SUMMARY:Bloco Teoria: A1. Álgebra linear");
    expect(ics).toContain("SUMMARY:Bloco Projeto: C2. Pulse AI: pipeline de dados");
    expect(ics).toContain("SUMMARY:Bloco Manhã: B1. Building with the Claude API");
    // A folga é de um dia só: a manhã aparece uma vez no feed inteiro.
    expect(ics.match(/SUMMARY:Bloco Manhã/g)).toHaveLength(1);
    expect(ics).toContain(`UID:bloco-${dia}-manha@pentagon`);
    expect(ics).toContain("TRIGGER:-PT5M");
  });

  it("antes da primeira abertura o feed não tem blocos", async () => {
    const { token } = await gerarToken(userId);
    expect(await feedPorToken(token)).not.toContain("SUMMARY:Bloco ");
  });

  it("quem não é dono não tem blocos, mesmo com o plano marcado como iniciado; token errado é 404", async () => {
    const amigo = await criarAmigo();
    await db().insert(settings).values({ userId: amigo, planoIniciadoEm: new Date() });
    const { token } = await gerarToken(amigo);
    expect(await feedPorToken(token)).not.toContain("Bloco ");
    expect(await titulos(HOJE, amigo)).toEqual([]);
    expect(await planoDeHoje(amigo, MANHA)).toBeNull();
    expect(await blocosDoPlano(amigo, { de: HOJE, ate: HOJE })).toEqual([]);

    const { GET } = await import("@/app/api/calendario/[token]/route");
    const falso = "x".repeat(43);
    const resposta = await GET(new Request(`http://localhost/api/calendario/${falso}.ics`), {
      params: Promise.resolve({ token: `${falso}.ics` }),
    } as never);
    expect(resposta.status).toBe(404);
  });
});

describe("feed e Ajustes: lacunas de acesso", () => {
  it("o feed do amigo não tem blocos mesmo com o plano do dono já iniciado", async () => {
    await iniciar();
    const amigo = await criarAmigo();
    await db().insert(settings).values({ userId: amigo, planoIniciadoEm: new Date() });
    const { token } = await gerarToken(amigo);
    const ics = (await feedPorToken(token))!;
    expect(ics).not.toContain("Bloco ");
    const dono = (await feedPorToken((await gerarToken(userId)).token))!;
    expect(dono).toContain("SUMMARY:Bloco Teoria");
  });

  it("token revogado dá 404 na rota", async () => {
    const { token } = await gerarToken(userId);
    await revogarTokens(userId);
    expect(await feedPorToken(token)).toBeNull();
    const { GET } = await import("@/app/api/calendario/[token]/route");
    const resposta = await GET(new Request(`http://localhost/api/calendario/${token}.ics`), {
      params: Promise.resolve({ token: `${token}.ics` }),
    } as never);
    expect(resposta.status).toBe(404);
  });

  it("dono sem estudos em areasNoFeed não tem blocos no feed", async () => {
    await iniciar();
    await atualizarAjustes(userId, { areasNoFeed: ["aulas"] });
    const { token } = await gerarToken(userId);
    expect(await feedPorToken(token)).not.toContain("Bloco ");
  });

  it("não dono: o PATCH grava o resto e descarta os campos do plano", async () => {
    const amigo = await criarAmigo();
    await atualizarAjustes(amigo, {
      avisoMin: 20,
      blocosPlano: { dias_uteis: { teoria: { inicio: "14:00" } } },
      perguntaFolga: "06:00",
      avisoBlocosMin: 30,
    });
    const a = await obterAjustes(amigo);
    expect([a.avisoMin, a.blocosPlano, a.perguntaFolga, a.avisoBlocosMin]).toEqual([
      20,
      null,
      "07:40",
      5,
    ]);
    // Só campos do plano: nada a gravar, e nada quebra.
    await atualizarAjustes(amigo, { perguntaFolga: "06:00" });
    expect((await obterAjustes(amigo)).perguntaFolga).toBe("07:40");
  });

  it("PATCH com planoIniciadoEm ou userId no corpo não altera essas colunas", async () => {
    const { PATCH } = await import("@/app/api/ajustes/route");
    const outro = await criarAmigo();
    sessao.userId = userId;
    const resposta = await PATCH(
      new NextRequest("http://localhost/api/ajustes", {
        method: "PATCH",
        body: JSON.stringify({
          planoIniciadoEm: "2020-01-01T00:00:00Z",
          userId: outro,
          avisoMin: 7,
        }),
      }),
      { params: Promise.resolve({}) },
    ).catch(() => null);
    void resposta; // o 200 depende de `after()`; o que importa é o banco.
    const [a] = await db().select().from(settings).where(eq(settings.userId, userId));
    expect(a.planoIniciadoEm).toBeNull();
    expect(a.userId).toBe(userId);
  });
});

describe("blocos fora dos avisos (etapa 5)", () => {
  it("com aparelho inscrito, os avisos agendados não incluem blocos nem a folga", async () => {
    await iniciar();
    await responderFolga(userId, { minutos: 120 }, MANHA);
    await salvarInscricao(userId, {
      endpoint: "https://push.exemplo/blocos",
      p256dh: "p",
      auth: "a",
      aparelho: "teste",
    });
    const agendador = { ativo: false, agendar: async () => null, cancelar: async () => {} };
    await reconciliarAvisos(userId, MANHA, agendador);
    const avisos = await db().select().from(notifications).where(eq(notifications.userId, userId));
    expect(avisos.length).toBeGreaterThan(0);
    expect(avisos.some((a) => a.titulo.includes("Bloco") || a.corpo?.includes("Bloco"))).toBe(
      false,
    );
    expect(avisos.map((a) => a.alvoTipo)).not.toContain("bloco");
    expect(avisos.map((a) => a.alvoTipo)).not.toContain("folga");
  });

  it("o serviço de avisos não importa os blocos do plano", () => {
    const fonte = readFileSync("src/server/servicos/avisos.ts", "utf8");
    expect(fonte).not.toMatch(/blocos|plano/i);
  });
});
