import { and, count, eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { carregarCatalogo, horasRestantes } from "@/lib/plano";
import {
  blocoFeitoPlanoSchema,
  checkPlanoSchema,
  conclusaoPlanoSchema,
  folgaPlanoSchema,
  planoInicioSchema,
  tentativaPlanoSchema,
  trocaPlanoSchema,
} from "@/lib/validacao";
import { db } from "@/server/db";
import {
  planoBlocos,
  planoChecks,
  planoContagens,
  planoFolgas,
  planoHistorico,
  planoItens,
  planoProgresso,
  planoTentativas,
  settings,
  users,
} from "@/server/db/schema";
import { Conflito, EntradaInvalida, Proibido } from "@/server/erros";
import planoJson from "@/server/plano/plano.json";
import { semearCatalogoPlano } from "@/server/plano/seed";
import {
  concluirItem,
  desfazerConclusao,
  estadoDoPlano,
  iniciarPlano,
  marcarBloco,
  marcarCheck,
  registrarTentativa,
  responderFolga,
  somarContador,
  trocarBloco,
} from "@/server/servicos/plano";
import { migrar } from "../../scripts/migrar";
import { AGORA, apagarUsuarioDeTeste, EMAIL, usuarioDeTeste } from "./apoio";

// A sessão é simulada só para exercitar a `rota` real (401, 403, 409 e 400 em HTTP).
const sessao = vi.hoisted(() => ({ userId: null as string | null }));
vi.mock("@/server/auth", () => ({
  auth: async () => (sessao.userId ? { user: { id: sessao.userId } } : null),
}));

// `after()` só roda dentro de uma requisição real: aqui a reconciliação dos avisos não agenda nada.
vi.mock("next/server", async (original) => ({
  ...(await original<typeof import("next/server")>()),
  after: vi.fn(),
}));

const OUTRO_DONO = "outro-dono-plano@pentagon.local";
const AMIGO = "amigo-plano@pentagon.local";
const donosAntes = process.env.OWNER_EMAILS;

/** Quarta-feira 21/10/2026 10:00 em São Paulo; `minutos` anda no mesmo dia para ordenar eventos. */
const t = (minutos = 0) => new Date(AGORA.getTime() + minutos * 60_000);
const SABADO = new Date("2026-10-24T15:00:00Z");

let userId: string;

async function criarUsuario(email: string) {
  await db().delete(users).where(eq(users.email, email));
  const [u] = await db().insert(users).values({ name: email, email }).returning();
  return u.id;
}

/** O estado já iniciado (falha se o plano ainda não foi aberto). */
async function estado(id = userId, agora = t()) {
  const { plano } = await estadoDoPlano(id, agora);
  if (!plano?.iniciado) throw new Error("Plano não iniciado.");
  return plano;
}

const atuais = async (id = userId) =>
  Object.fromEntries((await estado(id)).trilhas.map((x) => [x.slug, x.atual?.codigo ?? null]));

const iniciar = (marcados: string[], id = userId, incluirRequisitos = false) =>
  iniciarPlano(id, { marcados, incluirRequisitos }, t());

const concluir = (codigo: string, entrada: { nota?: number; aprovado?: boolean } = {}, min = 1) =>
  concluirItem(userId, codigo, entrada, t(min));

async function recusado(promessa: Promise<unknown>, motivo: string) {
  const erro = await promessa.then(
    () => null,
    (e: unknown) => e,
  );
  expect(erro).toBeInstanceOf(Conflito);
  expect((erro as Conflito).motivo).toBe(motivo);
  return erro as Conflito;
}

const contar = async (tabela: typeof planoProgresso | typeof planoTentativas, id = userId) =>
  (await db().select({ n: count() }).from(tabela).where(eq(tabela.userId, id)))[0].n;

const requisicao = (metodo: string, corpo?: unknown) =>
  new NextRequest("http://localhost/api/plano", {
    method: metodo,
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });

beforeAll(async () => {
  process.env.OWNER_EMAILS = `${EMAIL},${OUTRO_DONO}`;
  await semearCatalogoPlano(db());
});

beforeEach(async () => {
  userId = await usuarioDeTeste();
  sessao.userId = null;
});

afterAll(async () => {
  await semearCatalogoPlano(db());
  await apagarUsuarioDeTeste();
  await db().delete(users).where(eq(users.email, OUTRO_DONO));
  await db().delete(users).where(eq(users.email, AMIGO));
  if (donosAntes === undefined) delete process.env.OWNER_EMAILS;
  else process.env.OWNER_EMAILS = donosAntes;
});

describe("primeira abertura", () => {
  it("antes de abrir, devolve o catálogo e a sugestão; só o início funciona", async () => {
    const { plano } = await estadoDoPlano(userId, t());
    expect(plano).toMatchObject({ iniciado: false, sugestao: ["A0", "C1"] });
    if (plano?.iniciado !== false) throw new Error("esperava o plano não iniciado");
    expect(plano.catalogo.itens.length).toBeGreaterThan(30);

    await recusado(concluir("A0"), "nao_iniciado");
    await recusado(somarContador(userId, "questoes", t()), "nao_iniciado");
    await recusado(responderFolga(userId, { minutos: 60 }, t()), "nao_iniciado");
    await recusado(trocarBloco(userId, "teoria", { escolha: "cards" }, t()), "nao_iniciado");
    expect(await contar(planoProgresso)).toBe(0);
  });

  it("com A0 e C1 marcados, os atuais são A1, B1 e C2, com horas e progresso", async () => {
    await iniciar(["A0", "C1"]);
    const plano = await estado();
    expect(await atuais()).toEqual({ teoria: "A1", cursos: "B1", projetos: "C2" });

    const cat = carregarCatalogo(planoJson);
    const feitos = new Set(["A0", "C1"]);
    expect(plano.horasRestantes).toBe(horasRestantes(cat, feitos));
    const teoria = plano.trilhas.find((x) => x.slug === "teoria")!;
    expect(teoria.horasRestantes).toBe(horasRestantes(cat, feitos, { trilha: "teoria" }));
    expect(teoria.progresso.concluidos).toBe(1);
    expect(plano.trilhas.find((x) => x.slug === "projetos")!.progresso.concluidos).toBe(1);

    const historico = await db()
      .select()
      .from(planoHistorico)
      .where(eq(planoHistorico.userId, userId));
    expect(historico.map((h) => [h.acao, h.origem])).toEqual([
      ["inicio_marcado", "inicio"],
      ["inicio_marcado", "inicio"],
    ]);
  });

  it("o estado traz o fuso e o texto do padrão de entrega para a tela", async () => {
    await iniciar(["A0"]);
    const plano = await estado();
    expect(plano.fuso).toBe("America/Sao_Paulo");
    expect(plano.padraoDeEntrega).toEqual(carregarCatalogo(planoJson).padraoDeEntrega);
    expect(plano.padraoDeEntrega.length).toBeGreaterThan(0);
  });

  it("repetir a primeira abertura dá 409 e não grava nada", async () => {
    await iniciar(["A0"]);
    await recusado(iniciar(["A0", "C1"]), "ja_iniciado");
    expect(await contar(planoProgresso)).toBe(1);
  });

  it("conjunto sem fechamento dá 400 com a lista e nada gravado; incluirRequisitos grava o fechamento", async () => {
    const erro = await iniciar(["A2"]).then(
      () => null,
      (e: unknown) => e,
    );
    expect(erro).toBeInstanceOf(EntradaInvalida);
    const { requisitos } = (erro as EntradaInvalida).detalhes as {
      requisitos: { codigo: string }[];
    };
    expect(requisitos.map((r) => r.codigo)).toEqual(["A1"]);
    expect(await contar(planoProgresso)).toBe(0);
    const [ajustes] = await db().select().from(settings).where(eq(settings.userId, userId));
    expect(ajustes.planoIniciadoEm).toBeNull();

    await iniciar(["A2"], userId, true);
    expect(await atuais()).toMatchObject({ teoria: "A0" });
    const feitos = await db()
      .select()
      .from(planoProgresso)
      .where(eq(planoProgresso.userId, userId));
    expect(feitos.map((f) => f.codigo).sort()).toEqual(["A1", "A2"]);
  });

  it("aceita lista vazia e recusa código que não existe", async () => {
    await expect(iniciar(["Z9"])).rejects.toBeInstanceOf(EntradaInvalida);
    await iniciar([]);
    expect(await atuais()).toEqual({ teoria: "A0", cursos: "B1", projetos: "C1" });
  });
});

describe("concluir e desfazer", () => {
  beforeEach(() => iniciar(["A0", "C1"]));

  it("concluir A1 grava progresso e histórico, libera A2 e o desfazer funciona", async () => {
    const r = await concluir("A1");
    expect(r.liberacao[0]).toBe("Próximo conteúdo liberado: A2. Cálculo de uma variável");
    expect(r.liberados.proximo).toBe("A2");
    expect((await atuais()).teoria).toBe("A2");

    const [linha] = await db()
      .select()
      .from(planoProgresso)
      .where(and(eq(planoProgresso.userId, userId), eq(planoProgresso.codigo, "A1")));
    expect(linha.concluidoEm).toEqual(t(1));
    const acoes = await db()
      .select({ codigo: planoHistorico.codigo, acao: planoHistorico.acao })
      .from(planoHistorico)
      .where(and(eq(planoHistorico.userId, userId), eq(planoHistorico.codigo, "A1")));
    expect(acoes.map((a) => a.acao)).toEqual(["concluido"]);

    const antes = (await estado()).trilhas.find((x) => x.slug === "teoria")!;
    expect(antes.concluidos.find((c) => c.codigo === "A1")?.desfazivel).toBe(true);

    await desfazerConclusao(userId, "A1", t(2));
    expect((await atuais()).teoria).toBe("A1");
    expect(await contar(planoProgresso)).toBe(2);
    const depois = await db()
      .select({ acao: planoHistorico.acao })
      .from(planoHistorico)
      .where(and(eq(planoHistorico.userId, userId), eq(planoHistorico.codigo, "A1")));
    expect(depois.map((a) => a.acao).sort()).toEqual(["concluido", "desfeito"]);
  });

  it("A2 sem nota é recusada e nada é gravado", async () => {
    await concluir("A1");
    const erro = await recusado(concluir("A2", {}, 2), "nota_insuficiente");
    expect(erro.message).toBe("Para concluir, uma tentativa com 80% ou mais.");
    expect(await contar(planoTentativas)).toBe(0);
    expect((await atuais()).teoria).toBe("A2");
  });

  it("nota 79 grava só a tentativa; nota 80 conclui e libera A3", async () => {
    await concluir("A1");
    const erro = await recusado(concluir("A2", { nota: 79 }, 2), "nota_insuficiente");
    expect(erro.message).toBe("Tentativa registrada: 79%. Para passar, 80% ou mais.");
    const tentativas = await db()
      .select()
      .from(planoTentativas)
      .where(eq(planoTentativas.userId, userId));
    expect(tentativas.map((x) => [x.codigo, x.nota, x.aprovada])).toEqual([["A2", 79, false]]);
    expect(await contar(planoProgresso)).toBe(3);

    const r = await concluir("A2", { nota: 80 }, 3);
    expect(r.liberacao[0]).toBe("Próximo conteúdo liberado: A3. Cálculo de várias variáveis");
    const [a2] = await db()
      .select()
      .from(planoProgresso)
      .where(and(eq(planoProgresso.userId, userId), eq(planoProgresso.codigo, "A2")));
    expect(a2.notaFinal).toBe(80);
  });

  it("recusa concluir quem não é o item atual, mesmo com nota, e não grava tentativa", async () => {
    await recusado(concluir("A3", { nota: 95 }), "nao_e_atual");
    await recusado(concluir("A0"), "concluido");
    await recusado(concluir("B3"), "nao_e_atual");
    expect(await contar(planoTentativas)).toBe(0);
    expect(await contar(planoProgresso)).toBe(2);
    await expect(concluir("Z99")).rejects.toThrow("Conteúdo não encontrado.");
  });

  it("recusa desfazer com dependente concluído e o que não é a conclusão mais recente", async () => {
    await reiniciarComDependente();
    const erro = await recusado(desfazerConclusao(userId, "A5", t(1)), "dependente_concluido");
    expect(erro.message).toContain("C3");
    await recusado(desfazerConclusao(userId, "A4", t(1)), "nao_e_mais_recente");
    await recusado(desfazerConclusao(userId, "B1", t(1)), "nao_concluido");
    const [feitos] = await db()
      .select({ n: count() })
      .from(planoProgresso)
      .where(eq(planoProgresso.userId, userId));
    expect(feitos.n).toBeGreaterThan(5);
    const desfeitos = await db()
      .select()
      .from(planoHistorico)
      .where(and(eq(planoHistorico.userId, userId), eq(planoHistorico.acao, "desfeito")));
    expect(desfeitos).toHaveLength(0);
  });

  it("dois toques simultâneos concluem uma vez só", async () => {
    const resultados = await Promise.allSettled([concluir("A1"), concluir("A1")]);
    expect(resultados.map((r) => r.status).sort()).toEqual(["fulfilled", "rejected"]);
    const concluidos = await db()
      .select()
      .from(planoHistorico)
      .where(and(eq(planoHistorico.userId, userId), eq(planoHistorico.acao, "concluido")));
    expect(concluidos).toHaveLength(1);
  });

  it("item com aprovação pede a confirmação", async () => {
    await reiniciarComRequisitosDe("B5", "B1", "B4");
    await recusado(concluir("B5"), "aprovacao_nao_confirmada");
    const r = await concluir("B5", { aprovado: true });
    expect(r.concluido).toBe("B5");
  });

  /** Reinicia o plano com os pré-requisitos de C3 marcados (A5 é a conclusão mais recente da Teoria). */
  async function reiniciarComDependente() {
    await db().delete(settings).where(eq(settings.userId, userId));
    await db().delete(planoProgresso).where(eq(planoProgresso.userId, userId));
    await iniciar(["A0", "C3"], userId, true);
  }

  /** Reinicia o plano com tudo antes de `codigo` concluído. */
  async function reiniciarComRequisitosDe(codigo: string, ...marcados: string[]) {
    await db().delete(settings).where(eq(settings.userId, userId));
    await db().delete(planoProgresso).where(eq(planoProgresso.userId, userId));
    await iniciar(marcados, userId, true);
    expect((await atuais()).cursos).toBe(codigo);
  }
});

describe("tentativas de prova", () => {
  beforeEach(async () => {
    await iniciar(["A0", "C1"]);
    await concluir("A1");
  });

  it("registra a tentativa no item atual com nota e responde com a mensagem", async () => {
    const baixa = await registrarTentativa(userId, "A2", { nota: 72 }, t(2));
    expect(baixa.tentativa).toEqual({
      nota: 72,
      aprovada: false,
      mensagem: "Tentativa registrada: 72%. Para passar, 80% ou mais.",
    });
    const alta = await registrarTentativa(userId, "A2", { nota: 91 }, t(3));
    expect(alta.tentativa).toMatchObject({ aprovada: true, mensagem: "Tentativa aprovada: 91%." });
    const atual = (await estado()).trilhas.find((x) => x.slug === "teoria")!.atual!;
    expect(atual.tentativas.map((x) => x.nota)).toEqual([72, 91]);
  });

  it("recusa tentativa fora do item atual ou sem avaliação por nota, sem gravar", async () => {
    await recusado(registrarTentativa(userId, "A3", { nota: 90 }, t(2)), "nao_e_atual");
    await recusado(registrarTentativa(userId, "A1", { nota: 90 }, t(2)), "concluido");
    await recusado(registrarTentativa(userId, "B1", { nota: 90 }, t(2)), "sem_nota");
    expect(await contar(planoTentativas)).toBe(0);
  });
});

describe("checklists e contador", () => {
  it("o 'antes de começar' trava a conclusão até ser marcado; índice fora da lista dá 400", async () => {
    await iniciar(["B1"]);
    await recusado(concluir("B2"), "antes_de_comecar");

    await expect(
      marcarCheck(userId, { grupo: "antes", codigo: "B2", indice: 5, feito: true }, t(2)),
    ).rejects.toBeInstanceOf(EntradaInvalida);
    await marcarCheck(userId, { grupo: "antes", codigo: "B2", indice: 0, feito: true }, t(2));
    expect((await estado()).trilhas[1].atual!.checks.antes).toEqual([0]);

    await marcarCheck(userId, { grupo: "antes", codigo: "B2", indice: 0, feito: false }, t(3));
    await recusado(concluir("B2", {}, 4), "antes_de_comecar");
    await marcarCheck(userId, { grupo: "antes", codigo: "B2", indice: 0, feito: true }, t(5));
    await concluir("B2", {}, 6);
    expect((await atuais()).cursos).toBe("B3");
  });

  it("recusa check fora do item atual, sem gravar", async () => {
    await iniciar(["B1"]);
    await recusado(
      marcarCheck(userId, { grupo: "antes", codigo: "B3", indice: 0, feito: true }, t(2)),
      "nao_e_atual",
    );
    await recusado(
      marcarCheck(userId, { grupo: "etapas", codigo: "C2", indice: 0, feito: true }, t(2)),
      "nao_e_atual",
    );
    await recusado(
      marcarCheck(userId, { grupo: "recrutamento", indice: 0, feito: true }, t(2)),
      "recrutamento_bloqueado",
    );
    const linhas = await db().select().from(planoChecks).where(eq(planoChecks.userId, userId));
    expect(linhas).toHaveLength(0);
  });

  it("contador e checklist do recrutamento só depois de B5 e C8", async () => {
    await iniciar(["A0"]);
    await recusado(somarContador(userId, "questoes", t(2)), "recrutamento_bloqueado");
    expect((await estado()).recrutamento).toBeNull();
    const linhas = await db()
      .select()
      .from(planoContagens)
      .where(eq(planoContagens.userId, userId));
    expect(linhas).toHaveLength(0);
  });

  it("com o recrutamento liberado, soma na semana de hoje e marca o checklist", async () => {
    await iniciar(["B5", "C8"], userId, true);

    await somarContador(userId, "questoes", t(2));
    await somarContador(userId, "questoes", t(3));
    await marcarCheck(userId, { grupo: "recrutamento", indice: 1, feito: true }, t(4));
    await expect(
      marcarCheck(userId, { grupo: "recrutamento", indice: 99, feito: true }, t(4)),
    ).rejects.toBeInstanceOf(EntradaInvalida);
    await expect(somarContador(userId, "outra", t(5))).rejects.toThrow("Contador não encontrado.");

    const [linha] = await db()
      .select()
      .from(planoContagens)
      .where(eq(planoContagens.userId, userId));
    expect([linha.chave, linha.semana, linha.contagem]).toEqual(["questoes", "2026-10-19", 2]);
    const { recrutamento } = await estado();
    expect(recrutamento!.contadores[0]).toMatchObject({ chave: "questoes", feitas: 2 });
    expect(recrutamento!.checklist.map((c) => c.feito)).toEqual([false, true, false, false, false]);
  });
});

describe("folga, bloco feito e troca (só hoje)", () => {
  beforeEach(() => iniciar(["A0", "C1"]));

  it("a folga vale em dia útil, pode mudar no mesmo dia e não vale no fim de semana", async () => {
    await responderFolga(userId, { minutos: 60 }, t(1));
    await responderFolga(userId, { minutos: 180 }, t(2));
    const linhas = await db().select().from(planoFolgas).where(eq(planoFolgas.userId, userId));
    expect(linhas.map((l) => [l.data, l.minutos])).toEqual([["2026-10-21", 180]]);
    expect((await estado()).dia.folga).toBe(180);

    await recusado(responderFolga(userId, { minutos: 60 }, SABADO), "dia_sem_folga");
    expect(
      await db().select().from(planoFolgas).where(eq(planoFolgas.userId, userId)),
    ).toHaveLength(1);
  });

  it("'fiz este bloco' resolve o conteúdo no servidor, grava os minutos e pode ser desmarcado", async () => {
    await marcarBloco(userId, "teoria", { feito: true }, t(1));
    const [feito] = await db().select().from(planoBlocos).where(eq(planoBlocos.userId, userId));
    expect([feito.data, feito.bloco, feito.codigoEstudado, feito.minutos]).toEqual([
      "2026-10-21",
      "teoria",
      "A1",
      90,
    ]);
    expect(feito.feitoEm).toEqual(t(1));
    const atual = (await estado()).trilhas.find((x) => x.slug === "teoria")!.atual!;
    expect(atual.horasGastas).toBe(1.5);

    await marcarBloco(userId, "teoria", { feito: true, minutos: 30 }, t(2));
    expect(
      await db().select().from(planoBlocos).where(eq(planoBlocos.userId, userId)),
    ).toHaveLength(1);
    expect((await estado()).dia.blocos.find((b) => b.bloco === "teoria")).toMatchObject({
      feito: true,
      minutos: 30,
    });

    await marcarBloco(userId, "teoria", { feito: false }, t(3));
    const [desmarcado] = await db()
      .select()
      .from(planoBlocos)
      .where(eq(planoBlocos.userId, userId));
    expect([desmarcado.feitoEm, desmarcado.codigoEstudado]).toEqual([null, null]);
  });

  it("a troca vale para um item atual disponível ou Cards e Cerebro, e a limpeza volta à regra", async () => {
    await trocarBloco(userId, "teoria", { escolha: "item:B1" }, t(1));
    const bloco = () => estado().then((e) => e.dia.blocos.find((b) => b.bloco === "teoria")!);
    expect(await bloco()).toMatchObject({ escolha: "item:B1", origem: "troca" });

    await marcarBloco(userId, "teoria", { feito: true }, t(2));
    const [feito] = await db().select().from(planoBlocos).where(eq(planoBlocos.userId, userId));
    expect(feito.codigoEstudado).toBe("B1");
    await recusado(trocarBloco(userId, "teoria", { escolha: "cards" }, t(3)), "bloco_feito");
    await marcarBloco(userId, "teoria", { feito: false }, t(4));

    await trocarBloco(userId, "teoria", { escolha: "cards" }, t(5));
    expect(await bloco()).toMatchObject({ escolha: "cards" });
    await trocarBloco(userId, "teoria", { escolha: null }, t(6));
    expect(await bloco()).toMatchObject({ escolha: "item:A1", origem: "trilha" });
  });

  it("recusa troca para item bloqueado, concluído ou inexistente, sem gravar", async () => {
    await recusado(trocarBloco(userId, "teoria", { escolha: "item:A3" }, t(1)), "bloqueado");
    await recusado(trocarBloco(userId, "projeto", { escolha: "item:A0" }, t(1)), "concluido");
    await recusado(trocarBloco(userId, "projeto", { escolha: "item:Z9" }, t(1)), "inexistente");
    expect(
      await db().select().from(planoBlocos).where(eq(planoBlocos.userId, userId)),
    ).toHaveLength(0);
  });
});

describe("dia local do usuário (fuso America/Sao_Paulo)", () => {
  beforeEach(async () => {
    await iniciar(["A0", "C1"]);
    await db()
      .update(settings)
      .set({ fuso: "America/Sao_Paulo" })
      .where(eq(settings.userId, userId));
  });

  it("folga e bloco feito usam o dia local quando em UTC já é o dia seguinte", async () => {
    // 01:30 UTC de terça 20/10 ainda é segunda 19/10 às 22:30 em São Paulo.
    const tarde = new Date("2026-10-20T01:30:00Z");
    await responderFolga(userId, { minutos: 60 }, tarde);
    await marcarBloco(userId, "teoria", { feito: true }, tarde);
    const [folga] = await db().select().from(planoFolgas).where(eq(planoFolgas.userId, userId));
    const [bloco] = await db().select().from(planoBlocos).where(eq(planoBlocos.userId, userId));
    expect([folga.data, bloco.data]).toEqual(["2026-10-19", "2026-10-19"]);
    expect((await estado(userId, tarde)).hoje).toBe("2026-10-19");
  });

  it("domingo à noite no Brasil ainda é domingo: sem folga, e o contador soma na semana anterior", async () => {
    // 01:30 UTC de segunda 19/10 é domingo 18/10 às 22:30 em São Paulo.
    const domingo = new Date("2026-10-19T01:30:00Z");
    await recusado(responderFolga(userId, { minutos: 60 }, domingo), "dia_sem_folga");

    await db().delete(settings).where(eq(settings.userId, userId));
    await iniciar(["B5", "C8"], userId, true);
    await db()
      .update(settings)
      .set({ fuso: "America/Sao_Paulo" })
      .where(eq(settings.userId, userId));
    await somarContador(userId, "questoes", domingo);
    const [linha] = await db()
      .select()
      .from(planoContagens)
      .where(eq(planoContagens.userId, userId));
    expect(linha.semana).toBe("2026-10-12");
  });
});

describe("acesso", () => {
  it("fora do OWNER_EMAILS recebe plano nulo e 403 em toda escrita, sem gravar", async () => {
    const amigo = await criarUsuario(AMIGO);
    expect(await estadoDoPlano(amigo, t())).toEqual({ plano: null });

    const escritas = [
      () => iniciarPlano(amigo, { marcados: ["A0"], incluirRequisitos: false }),
      () => concluirItem(amigo, "A0", {}, t()),
      () => registrarTentativa(amigo, "A2", { nota: 90 }, t()),
      () => desfazerConclusao(amigo, "A0", t()),
      () => marcarCheck(amigo, { grupo: "antes", codigo: "B2", indice: 0, feito: true }, t()),
      () => somarContador(amigo, "questoes", t()),
      () => responderFolga(amigo, { minutos: 60 }, t()),
      () => marcarBloco(amigo, "teoria", { feito: true }, t()),
      () => trocarBloco(amigo, "teoria", { escolha: "cards" }, t()),
    ];
    for (const escrita of escritas) {
      await expect(escrita()).rejects.toThrow(new Proibido("Nenhum plano de estudos nesta conta."));
    }
    expect(await contar(planoProgresso, amigo)).toBe(0);
    const [ajustes] = await db().select().from(settings).where(eq(settings.userId, amigo));
    expect(ajustes?.planoIniciadoEm ?? null).toBeNull();
  });

  it("um dono não lê nem altera o progresso de outro", async () => {
    const outro = await criarUsuario(OUTRO_DONO);
    await iniciar(["A0", "C1"]);
    await concluir("A1");
    await iniciar([], outro);

    expect(await atuais(outro)).toEqual({ teoria: "A0", cursos: "B1", projetos: "C1" });
    const dele = (await estado(outro)).trilhas.flatMap((x) => x.concluidos.map((c) => c.codigo));
    expect(dele).toEqual([]);

    await recusado(desfazerConclusao(outro, "A1", t(5)), "nao_concluido");
    await recusado(concluirItem(outro, "A1", {}, t(5)), "nao_e_atual");
    expect(await contar(planoProgresso)).toBe(3);
    expect(await contar(planoProgresso, outro)).toBe(0);
  });

  it("nenhum esquema aceita userId no corpo", () => {
    const extra = { userId: "outro-usuario" };
    const validos = [
      [planoInicioSchema, { marcados: ["A0"] }],
      [conclusaoPlanoSchema, { nota: 90 }],
      [tentativaPlanoSchema, { nota: 90 }],
      [checkPlanoSchema, { grupo: "antes", codigo: "B2", indice: 0, feito: true }],
      [checkPlanoSchema, { grupo: "recrutamento", indice: 0, feito: true }],
      [folgaPlanoSchema, { minutos: 60 }],
      [blocoFeitoPlanoSchema, { feito: true }],
      [trocaPlanoSchema, { escolha: null }],
    ] as const;
    for (const [schema, corpo] of validos) {
      expect(schema.safeParse(corpo).success).toBe(true);
      expect(schema.safeParse({ ...corpo, ...extra }).success).toBe(false);
    }
  });

  it("valores fora do limite dão 400: nota 101, folga de 90 minutos, bloco de 241 minutos", () => {
    expect(tentativaPlanoSchema.safeParse({ nota: 101 }).success).toBe(false);
    expect(conclusaoPlanoSchema.safeParse({ nota: 101 }).success).toBe(false);
    expect(conclusaoPlanoSchema.safeParse({ nota: -1 }).success).toBe(false);
    expect(folgaPlanoSchema.safeParse({ minutos: 90 }).success).toBe(false);
    expect(blocoFeitoPlanoSchema.safeParse({ feito: true, minutos: 241 }).success).toBe(false);
    expect(blocoFeitoPlanoSchema.safeParse({ feito: true, minutos: 0 }).success).toBe(false);
    expect(trocaPlanoSchema.safeParse({ escolha: "item:../etc" }).success).toBe(false);
  });
});

describe("rotas (HTTP)", () => {
  it("sem sessão responde 401", async () => {
    const { GET } = await import("@/app/api/plano/route");
    const resposta = await GET(requisicao("GET"), { params: Promise.resolve({}) });
    expect(resposta.status).toBe(401);
  });

  it("dono: 409 com motivo na recusa e 400 com nota 101; não dono: nulo e 403", async () => {
    const { GET } = await import("@/app/api/plano/route");
    const { POST: inicio } = await import("@/app/api/plano/inicio/route");
    const { POST: concluirRota } = await import("@/app/api/plano/itens/[codigo]/concluir/route");
    const { PUT: folga } = await import("@/app/api/plano/folga/route");
    const vazio = { params: Promise.resolve({}) };
    const doItem = (codigo: string) => ({ params: Promise.resolve({ codigo }) });

    sessao.userId = userId;
    const aberto = await inicio(requisicao("POST", { marcados: ["A0", "C1"] }), vazio);
    expect(aberto.status).toBe(200);
    const repetido = await inicio(requisicao("POST", { marcados: ["A0"] }), vazio);
    expect(repetido.status).toBe(409);
    expect(await repetido.json()).toMatchObject({ motivo: "ja_iniciado" });

    const recusa = await concluirRota(requisicao("POST", { nota: 79 }), doItem("A2"));
    expect(recusa.status).toBe(409);
    expect(await recusa.json()).toMatchObject({ motivo: "nao_e_atual" });
    const invalida = await concluirRota(requisicao("POST", { nota: 101 }), doItem("A1"));
    expect(invalida.status).toBe(400);
    const comUserId = await concluirRota(requisicao("POST", { userId: "x" }), doItem("A1"));
    expect(comUserId.status).toBe(400);
    expect((await folga(requisicao("PUT", { minutos: 90 }), vazio)).status).toBe(400);
    expect((await concluirRota(requisicao("POST", {}), doItem("A1"))).status).toBe(200);

    sessao.userId = await criarUsuario(AMIGO);
    expect(await (await GET(requisicao("GET"), vazio)).json()).toEqual({ plano: null });
    const negado = await concluirRota(requisicao("POST", {}), doItem("A1"));
    expect(negado.status).toBe(403);
    expect(await negado.json()).toEqual({ erro: "Nenhum plano de estudos nesta conta." });
  });
});

describe("rotas: dono antes da validação", () => {
  it("quem não é dono recebe 403 mesmo com corpo ou parâmetro inválido", async () => {
    const { POST: tentativa } = await import("@/app/api/plano/itens/[codigo]/tentativas/route");
    const { PUT: folga } = await import("@/app/api/plano/folga/route");
    const { PUT: bloco } = await import("@/app/api/plano/blocos/[bloco]/route");
    sessao.userId = await criarUsuario(AMIGO);
    const doItem = (codigo: string) => ({ params: Promise.resolve({ codigo }) });

    expect((await tentativa(requisicao("POST", { nota: 101 }), doItem("A2"))).status).toBe(403);
    expect((await tentativa(requisicao("POST", { userId: "x" }), doItem("A2"))).status).toBe(403);
    expect((await tentativa(requisicao("POST", { nota: 90 }), doItem("????"))).status).toBe(403);
    expect(
      (await folga(requisicao("PUT", { minutos: 90 }), { params: Promise.resolve({}) })).status,
    ).toBe(403);
    const blocoInvalido = { params: Promise.resolve({ bloco: "x" }) };
    expect((await bloco(requisicao("PUT", { feito: true }), blocoInvalido)).status).toBe(403);
  });
});

describe("catálogo e seed", () => {
  it("o banco recusa bloco fora de manhã, teoria e projeto", async () => {
    await expect(
      db().insert(planoBlocos).values({ userId, data: "2026-10-21", bloco: "x" }),
    ).rejects.toThrow();
  });

  it("seed sem itens lança e não desativa o catálogo", async () => {
    const vazio = {
      ...planoJson,
      itens: [],
      recrutamento: { ...planoJson.recrutamento, liberaCom: [] },
    };
    await expect(semearCatalogoPlano(db(), vazio)).rejects.toThrow(/plano\.json inválido/);
    const ativos = await db().select().from(planoItens).where(eq(planoItens.ativo, true));
    expect(ativos).toHaveLength(planoJson.itens.length);
  });

  const contarItens = async () => (await db().select({ n: count() }).from(planoItens))[0].n;
  const itensDoSeed = planoJson.itens.length;

  it("migração e seed rodando duas vezes não duplicam", async () => {
    await migrar();
    await migrar();
    await semearCatalogoPlano(db());
    expect(await contarItens()).toBe(itensDoSeed);
    const ativos = await db().select().from(planoItens).where(eq(planoItens.ativo, true));
    expect(ativos).toHaveLength(itensDoSeed);
  });

  it("item removido do seed fica inativo, some das telas e o progresso continua", async () => {
    await iniciar(["A0", "C1"]);
    const ultimo = planoJson.itens.at(-1)!;
    expect(planoJson.itens.some((i) => i.requisitos?.includes(ultimo.codigo))).toBe(false);
    await db().insert(planoProgresso).values({ userId, codigo: ultimo.codigo, concluidoEm: t() });

    const semUltimo = { ...planoJson, itens: planoJson.itens.slice(0, -1) };
    await semearCatalogoPlano(db(), semUltimo);
    const [linha] = await db()
      .select()
      .from(planoItens)
      .where(eq(planoItens.codigo, ultimo.codigo));
    expect(linha.ativo).toBe(false);
    expect(await contarItens()).toBe(itensDoSeed);
    const [guardado] = await db()
      .select()
      .from(planoProgresso)
      .where(and(eq(planoProgresso.userId, userId), eq(planoProgresso.codigo, ultimo.codigo)));
    expect(guardado).toBeDefined();
    const concluidos = (await estado()).trilhas.flatMap((x) => x.concluidos.map((c) => c.codigo));
    expect(concluidos).not.toContain(ultimo.codigo);

    await semearCatalogoPlano(db());
    const [volta] = await db()
      .select()
      .from(planoItens)
      .where(eq(planoItens.codigo, ultimo.codigo));
    expect(volta.ativo).toBe(true);
  });

  it("seed inválido lança e não grava nada (o migrar falha junto)", async () => {
    const [primeiro] = planoJson.itens;
    const repetido = { ...planoJson, itens: [...planoJson.itens, primeiro] };
    await expect(semearCatalogoPlano(db(), repetido)).rejects.toThrow(/plano\.json inválido/);

    const comTravessao = {
      ...planoJson,
      itens: [{ ...primeiro, titulo: "Python — científico" }, ...planoJson.itens.slice(1)],
    };
    await expect(semearCatalogoPlano(db(), comTravessao)).rejects.toThrow(/plano\.json inválido/);
    const [a0] = await db().select().from(planoItens).where(eq(planoItens.codigo, "A0"));
    expect(a0.titulo).toBe(primeiro.titulo);
  });
});
