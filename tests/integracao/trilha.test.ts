import { and, eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { eventoSchema } from "@/lib/validacao";
import { db } from "@/server/db";
import { events, studySessions, studyWeeks } from "@/server/db/schema";
import { Conflito } from "@/server/erros";
import { semearTrilha } from "@/server/estudos/seed";
import { atualizarComChecagem, criarComChecagem } from "@/server/servicos/compromissos";
import { marcarSessao, sessoesEntre } from "@/server/servicos/estudos";
import {
  criarErro,
  errosParaRevisar,
  notasDasRevisoes,
  revisarErro,
  salvarRevisao,
} from "@/server/servicos/revisao";
import { apagarUsuarioDeTeste, usuarioDeTeste } from "./apoio";

let userId: string;

beforeEach(async () => {
  userId = await usuarioDeTeste();
});

afterAll(apagarUsuarioDeTeste);

const sessoesDoUsuario = () =>
  db().select().from(studySessions).where(eq(studySessions.userId, userId));

describe("seed da trilha (versão 2)", () => {
  it("rodar de novo não duplica sessões nem desmarca as feitas", async () => {
    const [seg, ter] = await sessoesEntre(userId, "2026-11-09", "2026-11-09");
    await marcarSessao(userId, seg.id, true);
    const antes = await sessoesDoUsuario();
    // 545 do cronograma menos as 80 tardes de terça e quinta cedidas à Segurança.
    expect(antes).toHaveLength(465);

    const r = await semearTrilha(db(), userId);
    expect(r.removidas).toBe(0);
    const depois = await sessoesDoUsuario();
    expect(depois).toHaveLength(465);
    expect(depois.find((s) => s.id === seg.id)?.status).toBe("feita");
    expect(depois.find((s) => s.id === ter.id)?.status).toBe("pendente");
    expect(depois.filter((s) => s.status === "feita")).toHaveLength(1);
  });

  it("segunda a quinta têm manhã; a tarde de terça e quinta é da Segurança fora das pausas", async () => {
    const semana = await sessoesEntre(userId, "2026-11-09", "2026-11-15");
    expect(semana.map((s) => `${s.data} ${s.turno} ${s.categoria}`)).toEqual([
      "2026-11-09 manha conteudo",
      "2026-11-09 tarde pratica",
      "2026-11-10 manha conteudo",
      "2026-11-11 manha conteudo",
      "2026-11-11 tarde pratica",
      "2026-11-12 manha conteudo",
      "2026-11-13 manha revisao_semanal",
      "2026-11-14 manha projeto",
      "2026-11-15 noite revisao_espacada",
    ]);
    expect(semana[0].tema).toBe("Cluster Maintenance");
    const [semana1] = await sessoesEntre(userId, "2026-10-26", "2026-10-26");
    expect(semana1.tema).toBe("Revisão CKA 1: Core Concepts e Scheduling");
    // Na Revisão CKA (pausa da Segurança), a tarde de terça volta para a DevOps.
    const pausa = await sessoesEntre(userId, "2026-10-27", "2026-10-27");
    expect(pausa.map((x) => x.turno)).toEqual(["manha", "tarde"]);
  });
});

describe("conflitos com o estudo da manhã", () => {
  it("a academia às 14:00 choca com a prática da tarde", async () => {
    const academia = eventoSchema.parse({
      titulo: "Academia cedo",
      areaId: "pessoal",
      data: "2026-11-09",
      hora: "14:00",
      duracaoMin: 90,
    });
    const erro = await criarComChecagem(userId, academia).catch((e) => e);
    expect(erro).toBeInstanceOf(Conflito);
    expect((erro as Conflito).detalhes).toMatchObject({
      conflitos: [{ com: "Prática do tema da manhã", comHorario: "14:00–15:30" }],
    });
  });

  it("o estágio não choca com as sessões das 08:00", async () => {
    const [estagio] = await db()
      .select()
      .from(events)
      .where(and(eq(events.userId, userId), eq(events.areaId, "estagio")));
    const mesmo = eventoSchema.parse({
      titulo: estagio.titulo,
      areaId: "estagio",
      data: "2026-10-26",
      hora: "07:30",
      duracaoMin: 270,
      diasSemana: [1, 2, 3, 4, 5],
    });
    await expect(atualizarComChecagem(userId, estagio.id, mesmo)).resolves.toBeTruthy();
  });
});

describe("revisão de sexta e caderno de erros", () => {
  async function semana(numero: number) {
    const [s] = await sessoesEntre(userId, "2026-11-06", "2026-11-06");
    const [w] = await db().select().from(studyWeeks).where(eq(studyWeeks.id, s.weekId));
    expect(w.numero).toBe(numero);
    return { sessao: s, weekId: w.id };
  }

  it("grava nota e pontos fracos por semana e mostra nas notas", async () => {
    const { weekId } = await semana(2);
    await salvarRevisao(userId, weekId, { etapas: [true, true, false, false], nota: 6 });
    await salvarRevisao(userId, weekId, { nota: 7, pontosFracos: "static pods; seletor" });
    const notas = await notasDasRevisoes(userId, "2026-11-08");
    expect(notas).toEqual([
      expect.objectContaining({ semana: 2, nota: 7, pontosFracos: "static pods; seletor" }),
    ]);
  });

  it("erro da sexta aparece no domingo três semanas depois; acertou sai, errou volta", async () => {
    const { sessao } = await semana(2);
    const erro = await criarErro(userId, {
      data: "2026-11-06",
      tema: "Static pods",
      errei: "Criei o manifest no nó errado",
      correto: "O manifest vai em /etc/kubernetes/manifests do nó certo",
      origem: "revisao_semanal",
      sessaoId: sessao.id,
    });
    expect(erro.revisarEm).toBe("2026-11-27");
    expect(await errosParaRevisar(userId, "2026-11-22")).toEqual([]);
    expect((await errosParaRevisar(userId, "2026-11-29")).map((e) => e.id)).toEqual([erro.id]);

    const deNovo = await revisarErro(userId, erro.id, "errei", "2026-11-29");
    expect(deNovo.revisarEm).toBe("2026-12-20");
    expect(deNovo.reincidencias).toBe(1);
    expect(await errosParaRevisar(userId, "2026-11-29")).toEqual([]);
    expect((await errosParaRevisar(userId, "2026-12-20")).map((e) => e.id)).toEqual([erro.id]);

    await revisarErro(userId, erro.id, "acertei", "2026-12-20");
    expect(await errosParaRevisar(userId, "2026-12-20")).toEqual([]);
  });
});
