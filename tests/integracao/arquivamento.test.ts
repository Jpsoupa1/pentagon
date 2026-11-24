import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eventoSchema } from "@/lib/validacao";
import { horaLocal } from "@/lib/tempo";
import { executarFerramenta } from "@/server/assistente/ferramentas";
import { db } from "@/server/db";
import {
  arquivamentos,
  calendarTokens,
  events,
  notifications,
  roadmapRequirementProgress,
  settings,
  studyErrors,
  studySessions,
  studyTracks,
  studyWeeks,
  users,
} from "@/server/db/schema";
import { semearTrilha } from "@/server/estudos/seed";
import { semearSeguranca } from "@/server/estudos/seguranca";
import { arquivadosDe } from "@/server/plano/arquivados";
import { BLOCOS_PLANO_PADRAO, migrarPlano } from "@/server/plano/migracao";
import { semearRoadmap } from "@/server/roadmap/seed";
import { semearRotina } from "@/server/rotina/seed";
import { ocorrencias, painelHoje } from "@/server/servicos/agenda";
import { acervo, cardsDeHoje, importarCards } from "@/server/servicos/cards";
import { feedPorToken } from "@/server/servicos/calendario";
import { criarComChecagem } from "@/server/servicos/compromissos";
import { exportarTudo } from "@/server/servicos/exportar";
import { listarEventos } from "@/server/servicos/eventos";
import { resumoDoCaderno, criarErro, errosParaRevisar } from "@/server/servicos/revisao";
import { resumoNavegacao } from "@/server/servicos/navegacao";
import { migrarPlanoParaTodos } from "../../scripts/migrar-plano";
import { semearRoadmapParaTodos } from "../../scripts/seed-roadmap";
import { semearSegurancaParaTodos } from "../../scripts/seed-seguranca";
import { semearTrilhaParaTodos } from "../../scripts/seed-trilha";
import { exemplo } from "./exemplo";
import {
  AGORA,
  banco,
  criarDono as criarDonoAntigo,
  criarUsuario,
  FUSO,
  HOJE,
  reconciliar,
  TERCA,
} from "./dono-antigo";

const DONO = "dono-arquivamento@pentagon.local";
const OUTRO_DONO = "outro-dono-arquivamento@pentagon.local";
const AMIGO = "amigo-arquivamento@pentagon.local";

const criarDono = (email = DONO) => criarDonoAntigo(email);

type Conexao = Parameters<typeof migrarPlano>[0];

const ligar = (alvo: object, prop: string | symbol) => {
  const valor = Reflect.get(alvo, prop);
  return typeof valor === "function" ? valor.bind(alvo) : valor;
};

/** A mesma conexão, mas o primeiro UPDATE dentro da transação falha (como um erro do banco no meio). */
const comFalhaNoUpdate = (real: Conexao): Conexao =>
  new Proxy(real, {
    get(alvo, prop) {
      if (prop !== "transaction") return ligar(alvo, prop);
      return (fn: (tx: Conexao) => Promise<unknown>) =>
        alvo.transaction((tx) =>
          fn(
            new Proxy(tx, {
              get(t, p) {
                if (p !== "update") return ligar(t, p);
                return () => {
                  throw new Error("falha simulada");
                };
              },
            }),
          ),
        );
    },
  });

const academia = async (id: string) => {
  const [a] = await db()
    .select()
    .from(events)
    .where(and(eq(events.userId, id), eq(events.titulo, "Academia")));
  return a;
};

const TABELAS_DO_USUARIO = [
  "study_tracks",
  "study_sessions",
  "study_reviews",
  "study_errors",
  "events",
  "event_exceptions",
  "flashcards",
  "flashcard_answers",
  "roadmap_requirement_progress",
  "roadmap_practice_progress",
  "notifications",
  "subjects",
] as const;

async function linhas(tabela: string, id: string, extra = sql``) {
  const r = await db().execute(
    sql`select t::text as linha from ${sql.identifier(tabela)} t where t.user_id = ${id} ${extra} order by 1`,
  );
  return r.rows.map((x) => x.linha as string);
}

/** Cada tabela do usuário como texto: igual antes e depois quer dizer nenhuma linha apagada ou alterada. */
async function retrato(id: string) {
  const saida: Record<string, string[]> = {};
  for (const t of TABELAS_DO_USUARIO) {
    // A Academia é a única linha que a migração pode alterar (e só na duração).
    saida[t] = await linhas(t, id, t === "events" ? sql`and t.titulo <> 'Academia'` : sql``);
  }
  const semanas = await db().execute(
    sql`select w::text as linha from study_weeks w join study_tracks t on t.id = w.track_id where t.user_id = ${id} order by 1`,
  );
  saida.study_weeks = semanas.rows.map((x) => x.linha as string);
  return saida;
}

const chaves = async (id: string) =>
  (await db().select().from(arquivamentos).where(eq(arquivamentos.userId, id)))
    .map((a) => `${a.tipo}:${a.chave}`)
    .sort();

const donosAntes = process.env.OWNER_EMAILS;

beforeEach(() => {
  process.env.OWNER_EMAILS = [DONO, OUTRO_DONO].join(",");
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  if (donosAntes === undefined) delete process.env.OWNER_EMAILS;
  else process.env.OWNER_EMAILS = donosAntes;
});

afterAll(async () => {
  for (const e of [DONO, OUTRO_DONO, AMIGO]) await db().delete(users).where(eq(users.email, e));
});

describe("migração de dados do plano", () => {
  it("arquiva tudo do dono sem apagar nem alterar nenhuma linha, acerta a Academia e grava os padrões", async () => {
    const id = await criarDono();
    const antes = await retrato(id);
    expect((await academia(id)).duracaoMin).toBe(90);

    expect(await migrarPlano(db(), id, AGORA)).toBe("migrado");

    expect(await retrato(id)).toEqual(antes);
    const [ciber] = await db()
      .select({ id: events.id })
      .from(events)
      .where(and(eq(events.userId, id), eq(events.titulo, "Ciber e SecOps")));
    // Todos os roadmaps do catálogo, com ou sem progresso.
    expect(await chaves(id)).toEqual(
      [
        "trilha_estudo:devops",
        "trilha_estudo:seguranca",
        "roadmap:devops",
        "roadmap:seguranca",
        "cards:CKA",
        "cards:SEG",
        "erros:antes_do_plano",
        `evento:${ciber.id}`,
      ].sort(),
    );

    const a = await academia(id);
    expect([a.duracaoMin, horaLocal(a.inicio, a.fuso)]).toEqual([80, "16:00"]);
    const [ajuste] = await db().select().from(settings).where(eq(settings.userId, id));
    expect(ajuste.planoMigradoEm).toEqual(AGORA);
    expect(ajuste.blocosPlano).toEqual(BLOCOS_PLANO_PADRAO);
    expect([ajuste.perguntaFolga, ajuste.avisoBlocosMin]).toEqual(["07:40", 5]);
  });

  it("rodar duas vezes não duplica nada", async () => {
    const id = await criarDono();
    expect(await migrarPlano(db(), id, AGORA)).toBe("migrado");
    const depoisDaPrimeira = { chaves: await chaves(id), academia: await academia(id) };
    expect(await migrarPlano(db(), id, AGORA)).toBe("ja_migrado");
    expect(await migrarPlano(db(), id, new Date())).toBe("ja_migrado");
    expect({ chaves: await chaves(id), academia: await academia(id) }).toEqual(depoisDaPrimeira);
  });

  it("apagar uma linha de arquivamentos e rodar o deploy de novo não arquiva outra vez", async () => {
    const id = await criarDono();
    await migrarPlanoParaTodos(banco(), { email: DONO, agora: AGORA, reconciliar });
    const antes = await chaves(id);
    await db()
      .delete(arquivamentos)
      .where(
        and(
          eq(arquivamentos.userId, id),
          eq(arquivamentos.tipo, "trilha_estudo"),
          eq(arquivamentos.chave, "devops"),
        ),
      );

    // O deploy seguinte roda os seeds e a migração: a DevOps reativada continua ativa.
    await migrarPlanoParaTodos(banco(), { email: DONO, agora: AGORA, reconciliar });
    expect(await chaves(id)).toEqual(antes.filter((c) => c !== "trilha_estudo:devops"));
    expect((await arquivadosDe(db(), id)).trilhasEstudo.has("devops")).toBe(false);
    expect(
      (await ocorrencias(id, { de: TERCA, ate: TERCA })).some((o) => o.origem === "sessao"),
    ).toBe(true);
  });

  it.each([
    ["às 17:00", { hora: "17:00", duracaoMin: 90 }],
    ["com 60 minutos", { hora: "16:00", duracaoMin: 60 }],
  ])("Academia alterada pelo usuário %s não muda", async (_nome, mudanca) => {
    const id = await criarDono();
    const [a] = [await academia(id)];
    const inicio = new Date(a.inicio.getTime() + (mudanca.hora === "17:00" ? 60 * 60_000 : 0));
    await db()
      .update(events)
      .set({ inicio, duracaoMin: mudanca.duracaoMin })
      .where(eq(events.id, a.id));
    const [antes] = [await academia(id)];

    await migrarPlano(db(), id, AGORA);
    expect(await academia(id)).toEqual(antes);
  });

  it("quem não é dono não tem arquivamento nem migração, e a agenda dele fica igual", async () => {
    const amigo = await criarUsuario(AMIGO);
    await criarComChecagem(
      amigo,
      eventoSchema.parse({
        titulo: "Academia",
        areaId: "pessoal",
        data: TERCA,
        hora: "16:00",
        duracaoMin: 90,
        diasSemana: [2],
      }),
    );
    const semana = { de: "2026-10-26", ate: "2026-11-01" };
    const antes = await ocorrencias(amigo, semana);

    expect(await migrarPlano(db(), amigo, AGORA)).toBe("nao_dono");
    await migrarPlanoParaTodos(banco(), { email: AMIGO, agora: AGORA, reconciliar });

    expect(await chaves(amigo)).toEqual([]);
    const [ajuste] = await db().select().from(settings).where(eq(settings.userId, amigo));
    expect(ajuste?.planoMigradoEm ?? null).toBeNull();
    expect(ajuste?.blocosPlano ?? null).toBeNull();
    expect((await academia(amigo)).duracaoMin).toBe(90);
    expect(await ocorrencias(amigo, semana)).toEqual(antes);
  });

  it("a falha de um usuário desfaz só a dele, não impede os outros e o deploy lança com o id", async () => {
    const quebra = await criarDono(DONO);
    const bom = await criarDono(OUTRO_DONO);
    const antes = await retrato(quebra);
    vi.spyOn(console, "error").mockImplementation(() => {});

    // A falha vem do UPDATE da Academia, depois de os arquivamentos já terem sido inseridos.
    const migrar: typeof migrarPlano = (conexao, id, agora) =>
      migrarPlano(id === quebra ? comFalhaNoUpdate(conexao) : conexao, id, agora);

    await expect(
      migrarPlanoParaTodos(banco(), { agora: AGORA, migrar, reconciliar }),
    ).rejects.toThrow(new RegExp(quebra));

    // Quem falhou ficou exatamente como estava; o outro foi migrado.
    expect(await chaves(quebra)).toEqual([]);
    expect(await retrato(quebra)).toEqual(antes);
    expect((await academia(quebra)).duracaoMin).toBe(90);
    const [ajusteQuebra] = await db().select().from(settings).where(eq(settings.userId, quebra));
    expect(ajusteQuebra.planoMigradoEm).toBeNull();
    expect((await chaves(bom)).length).toBeGreaterThan(0);
    expect((await academia(bom)).duracaoMin).toBe(80);

    // O próximo deploy migra quem tinha falhado.
    await migrarPlanoParaTodos(banco(), { agora: AGORA, reconciliar });
    expect((await chaves(quebra)).length).toBeGreaterThan(0);
  });
});

describe("segurança do passo de dados", () => {
  it("o log da falha tem o id e não o e-mail nem o objeto do erro", async () => {
    const quebra = await criarDono(DONO);
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const migrar: typeof migrarPlano = async () => {
      throw Object.assign(
        new Error("Failed query: insert ... params: dono-arquivamento@pentagon.local"),
        {
          query: "insert ...",
          params: [DONO],
        },
      );
    };

    const erro = await migrarPlanoParaTodos(banco(), {
      email: DONO,
      agora: AGORA,
      migrar,
      reconciliar,
    }).then(
      () => new Error("não lançou"),
      (e: Error) => e,
    );

    const saida = JSON.stringify(log.mock.calls) + erro.message;
    expect(erro.message).toContain(quebra);
    expect(saida).toContain(quebra);
    expect(saida).not.toContain(DONO);
    expect(saida).not.toContain("params");
    expect(log.mock.calls.flat().every((x) => typeof x === "string")).toBe(true);
  });

  it("sem OWNER_EMAILS ninguém é migrado; na Vercel isso quebra o deploy", async () => {
    const id = await criarDono();
    process.env.OWNER_EMAILS = "";
    vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(await migrarPlano(db(), id, AGORA)).toBe("nao_dono");
    await expect(migrarPlanoParaTodos(banco(), { agora: AGORA, reconciliar })).resolves.toEqual({
      migrados: [],
    });
    expect(await chaves(id)).toEqual([]);
    const [ajuste] = await db().select().from(settings).where(eq(settings.userId, id));
    expect(ajuste.planoMigradoEm).toBeNull();

    vi.stubEnv("VERCEL_ENV", "preview");
    await expect(migrarPlanoParaTodos(banco(), { agora: AGORA, reconciliar })).rejects.toThrow(
      /OWNER_EMAILS/,
    );
    vi.unstubAllEnvs();
    expect(await chaves(id)).toEqual([]);
  });
});

describe("o que o arquivamento esconde", () => {
  it("agenda, conflitos, Hoje, menu e compromissos não mostram mais a DevOps nem o Ciber e SecOps", async () => {
    const id = await criarDono();
    const semana = { de: "2026-10-26", ate: "2026-11-01" };
    const sinais = (lista: Awaited<ReturnType<typeof ocorrencias>>) => ({
      sessoes: lista.filter((o) => o.origem === "sessao").length,
      marcos: lista.filter((o) => o.origem === "marco").length,
      ciber: lista.filter((o) => o.titulo === "Ciber e SecOps").length,
    });
    const reuniao = eventoSchema.parse({
      titulo: "Reunião",
      areaId: "pessoal",
      data: TERCA,
      hora: "18:00",
      duracaoMin: 30,
    });

    // Antes: aparecem e o horário do Ciber e SecOps conflita.
    const antes = sinais(await ocorrencias(id, semana));
    expect(antes.sessoes).toBeGreaterThan(0);
    expect(antes.ciber).toBeGreaterThan(0);
    await expect(criarComChecagem(id, reuniao)).rejects.toThrow(/choca/);
    expect((await listarEventos(id)).some((e) => e.titulo === "Ciber e SecOps")).toBe(true);
    expect((await resumoNavegacao(id)).contadores.estudos).toBeGreaterThan(0);

    await migrarPlano(db(), id, AGORA);

    expect(sinais(await ocorrencias(id, semana))).toEqual({ sessoes: 0, marcos: 0, ciber: 0 });
    await expect(criarComChecagem(id, reuniao)).resolves.toMatchObject({ titulo: "Reunião" });
    expect((await listarEventos(id)).map((e) => e.titulo)).not.toContain("Ciber e SecOps");
    const hoje = await painelHoje(id, new Date("2026-10-28T13:00:00Z"));
    expect(hoje.pendentes).toEqual({ total: 0, lista: [] });
    expect(hoje.cards.total).toBe(0);
    expect(
      hoje.doDia.filter((o) => o.origem === "sessao" || o.titulo === "Ciber e SecOps"),
    ).toEqual([]);
    expect((await resumoNavegacao(id)).contadores.estudos).toBe(0);
    // O que não foi arquivado continua: estágio, Academia e aulas.
    const titulos = (await ocorrencias(id, { de: TERCA, ate: TERCA })).map((o) => o.titulo);
    expect(titulos).toEqual(
      expect.arrayContaining(["Estágio na Codevasf", "Academia", "Análise e Projeto de Sistemas"]),
    );
  });

  it("o feed ICS e o assistente (listar_agenda) não trazem o arquivado", async () => {
    const id = await criarDono();
    await db().insert(calendarTokens).values({ userId: id, token: "token-arquivamento" });
    const ics = async () => (await feedPorToken("token-arquivamento"))!;
    const consulta = async () =>
      (
        await executarFerramenta(
          { userId: id, runId: randomUUID(), fuso: FUSO, agora: AGORA },
          "listar_agenda",
          { de: "2026-10-26", ate: "2026-11-01" },
        )
      ).texto;

    expect(await ics()).toContain("Ciber e SecOps");
    expect(await consulta()).toContain("Ciber e SecOps");

    await migrarPlano(db(), id, AGORA);

    const feed = await ics();
    expect(feed).not.toContain("Ciber e SecOps");
    expect(feed).not.toMatch(/SUMMARY:.*(Conteúdo|Prática|Revisão)/);
    expect(feed).toContain("Academia");
    const texto = await consulta();
    expect(texto).not.toContain("Ciber e SecOps");
    expect(texto).not.toContain('"origem":"sessao"');
    expect(texto).toContain("Academia");
  });

  it("os avisos agendados da DevOps e do Ciber e SecOps ficam cancelados", async () => {
    const id = await criarDono();
    const agendados = async () =>
      (
        await db()
          .select()
          .from(notifications)
          .where(and(eq(notifications.userId, id), eq(notifications.status, "agendada")))
      ).map((n) => n.alvoTipo);
    expect(await agendados()).toEqual(expect.arrayContaining(["sessao", "evento"]));

    await migrarPlanoParaTodos(banco(), { email: DONO, agora: AGORA, reconciliar });

    const restantes = await agendados();
    expect(restantes).not.toContain("sessao");
    const doCiber = await db()
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, id), eq(notifications.alvoTipo, "evento")));
    expect(
      doCiber.every((n) => !n.titulo.includes("Ciber e SecOps") || n.status !== "agendada"),
    ).toBe(true);
  });

  it("cards de CKA e SEG somem da sessão e do acervo, mas ficam no banco; os novos de outra trilha aparecem", async () => {
    const id = await criarDono();
    const semDados = (await acervo(id, AGORA)).cards.length;
    expect(semDados).toBe(6);

    await migrarPlano(db(), id, AGORA);

    const depois = await acervo(id, AGORA);
    expect(depois.cards).toEqual([]);
    expect(depois.respostas).toEqual([]);
    expect((await cardsDeHoje(id, HOJE, 20)).total).toBe(0);
    const noBanco = await db().execute(
      sql`select count(*)::int as n from flashcards where user_id = ${id}`,
    );
    expect(noBanco.rows[0].n).toBe(6);

    await importarCards(id, {
      cards: [{ ...exemplo.cards[0], id: "teoria-001", trilha: "TEORIA" }],
    });
    expect((await acervo(id, AGORA)).cards.map((c) => c.chave)).toEqual(["teoria-001"]);
  });

  it("o caderno oculta os erros anteriores ao arquivamento e mostra os novos", async () => {
    const id = await criarDono();
    expect((await resumoDoCaderno(id)).abertos).toBe(1);

    await migrarPlano(db(), id, AGORA);
    expect((await resumoDoCaderno(id)).abertos).toBe(0);
    expect(await errosParaRevisar(id, "2026-10-25")).toEqual([]);

    await criarErro(id, {
      data: HOJE,
      tema: "rbac",
      errei: "confundi Role e ClusterRole",
      correto: "Role vale num namespace",
    });
    expect((await resumoDoCaderno(id)).abertos).toBe(1);
    const noBanco = await db().select().from(studyErrors).where(eq(studyErrors.userId, id));
    expect(noBanco).toHaveLength(2);
  });

  it("a exportação traz o arquivado, com a marca", async () => {
    const id = await criarDono();
    await migrarPlano(db(), id, AGORA);

    const dados = await exportarTudo(id);
    expect(dados.trilhas.map((t) => [t.slug, t.arquivado]).sort()).toEqual([
      ["devops", true],
      ["seguranca", true],
    ]);
    expect(dados.sessoes.length).toBeGreaterThan(500);
    expect(dados.sessoes.every((s) => s.arquivado)).toBe(true);
    expect(dados.eventos.find((e) => e.titulo === "Ciber e SecOps")?.arquivado).toBe(true);
    expect(dados.eventos.find((e) => e.titulo === "Academia")?.arquivado).toBe(false);
    expect(dados.flashcards).toHaveLength(6);
    expect(dados.flashcards.every((c) => c.arquivado)).toBe(true);
    expect(dados.arquivamentos.map((a) => a.tipo)).toEqual(
      expect.arrayContaining(["trilha_estudo", "roadmap", "cards", "evento", "erros"]),
    );
  });
});

describe("seeds respeitam o arquivado", () => {
  it("o deploy e o login não recriam nem limpam o que está arquivado", async () => {
    const id = await criarDono();
    await migrarPlano(db(), id, AGORA);
    const antes = await retrato(id);

    // Mudanças que um seed ativo desfaria: nome da trilha, sessão pendente fora do período
    // (que a limpeza apagaria) e progresso do roadmap que faltaria.
    const [devops] = await db()
      .select()
      .from(studyTracks)
      .where(and(eq(studyTracks.userId, id), eq(studyTracks.slug, "devops")));
    const [semana] = await db()
      .select()
      .from(studyWeeks)
      .where(eq(studyWeeks.trackId, devops.id))
      .limit(1);
    await db()
      .update(studyTracks)
      .set({ nome: "DevOps (arquivada)" })
      .where(eq(studyTracks.id, devops.id));
    await db().insert(studySessions).values({
      userId: id,
      trackId: devops.id,
      weekId: semana.id,
      data: "2031-01-04",
      turno: "manha",
      categoria: "conteudo",
      tipo: "Conteúdo",
      conteudo: "fora do período",
    });
    const [progresso] = await db()
      .select()
      .from(roadmapRequirementProgress)
      .where(eq(roadmapRequirementProgress.userId, id))
      .limit(1);
    await db()
      .delete(roadmapRequirementProgress)
      .where(
        and(
          eq(roadmapRequirementProgress.userId, id),
          eq(roadmapRequirementProgress.requirementId, progresso.requirementId),
        ),
      );
    const referencia = await retrato(id);

    // Deploy: os seeds por usuário, cada um pelo script que o deploy usa.
    await semearTrilhaParaTodos(banco(), DONO);
    await semearSegurancaParaTodos(banco(), DONO);
    await semearRoadmapParaTodos(banco(), DONO);
    // Login (createUser): as mesmas funções, nesta ordem.
    expect(await semearTrilha(db(), id)).toMatchObject({ arquivada: true });
    await semearRotina(db(), id);
    expect(await semearSeguranca(db(), id)).toEqual({
      criada: false,
      migrada: false,
      arquivada: true,
    });
    await semearRoadmap(db(), [id]);

    expect(await retrato(id)).toEqual(referencia);
    expect(referencia).not.toEqual(antes);
    const [nome] = await db()
      .select({ nome: studyTracks.nome })
      .from(studyTracks)
      .where(eq(studyTracks.id, devops.id));
    expect(nome.nome).toBe("DevOps (arquivada)");
  });

  it("sem arquivamento, o seed continua limpando as sessões pendentes fora do período", async () => {
    const id = await criarDono();
    const [devops] = await db()
      .select()
      .from(studyTracks)
      .where(and(eq(studyTracks.userId, id), eq(studyTracks.slug, "devops")));
    const [semana] = await db()
      .select()
      .from(studyWeeks)
      .where(eq(studyWeeks.trackId, devops.id))
      .limit(1);
    await db().insert(studySessions).values({
      userId: id,
      trackId: devops.id,
      weekId: semana.id,
      data: "2031-01-04",
      turno: "manha",
      categoria: "conteudo",
      tipo: "Conteúdo",
      conteudo: "fora do período",
    });
    expect((await semearTrilha(db(), id)).removidas).toBe(1);
  });
});
