import { describe, expect, it } from "vitest";
import { proximaRepeticao } from "@/lib/repeticao";
import { paraUtc } from "@/lib/tempo";
import type { EventoParaExpandir } from "./recorrencia";
import { encontrarConflitos, expandirComRegras } from "./regras";

const fuso = "America/Sao_Paulo";
const base = { fuso, diaInteiro: false, repeteAte: null } as const;
const aula: EventoParaExpandir = {
  ...base,
  id: "aed",
  titulo: "Algoritmos e Estrutura de Dados",
  areaId: "aulas",
  inicio: paraUtc("2026-08-03", "19:10"),
  duracaoMin: 170,
  diasSemana: [1],
  repeteDesde: "2026-08-03",
};
const estagio: EventoParaExpandir = {
  ...base,
  id: "est",
  titulo: "Estágio na Codevasf",
  areaId: "estagio",
  inicio: paraUtc("2026-08-03", "07:30"),
  duracaoMin: 270,
  diasSemana: [1, 2, 3, 4, 5],
  repeteDesde: "2026-08-03",
};
const academia: EventoParaExpandir = {
  ...base,
  id: "acad",
  titulo: "Academia",
  areaId: "pessoal",
  inicio: paraUtc("2026-08-03", "16:00"),
  duracaoMin: 90,
  diasSemana: [1, 2, 3, 4, 5],
  repeteDesde: "2026-08-03",
};
const semana = { de: "2026-11-30", ate: "2026-12-06" };

describe("período letivo", () => {
  it("aulas só acontecem dentro do período; outras áreas não mudam", () => {
    const periodo = { inicio: "2026-08-03", fim: "2026-12-01" };
    const oc = expandirComRegras([aula, estagio], [], [], periodo, {
      de: "2026-11-30",
      ate: "2026-12-14",
    });
    expect(oc.filter((o) => o.areaId === "aulas").map((o) => o.dataOriginal)).toEqual([
      "2026-11-30",
    ]);
    expect(oc.filter((o) => o.areaId === "estagio")).toHaveLength(11);
  });

  it("sem período definido, as aulas seguem a recorrência", () => {
    const oc = expandirComRegras(
      [aula],
      [],
      [],
      { inicio: null, fim: null },
      { de: "2026-11-30", ate: "2026-12-14" },
    );
    expect(oc).toHaveLength(3);
  });
});

describe("feriados", () => {
  const feriado = {
    id: "f",
    data: "2026-12-01",
    nome: "Teste",
    areasCanceladas: ["aulas" as const, "estagio" as const],
  };

  it("cancela aula e estágio do dia, mas não a academia", () => {
    const oc = expandirComRegras([estagio, academia], [], [feriado], null, semana);
    const doDia = oc.filter((o) => o.dataOriginal === "2026-12-01").map((o) => o.titulo);
    expect(doDia).toEqual(["Academia"]);
    expect(oc.filter((o) => o.areaId === "estagio")).toHaveLength(4);
  });

  it("um feriado numa segunda tira a aula daquele dia", () => {
    const seg = { ...feriado, data: "2026-11-30" };
    expect(expandirComRegras([aula], [], [seg], null, semana)).toHaveLength(0);
    expect(expandirComRegras([aula], [], [], null, semana)).toHaveLength(1);
  });

  it("uma mudança feita pelo usuário no dia vale mais que o feriado", () => {
    const movida = {
      eventId: "est",
      data: "2026-12-01",
      tipo: "movida" as const,
      novoInicio: paraUtc("2026-12-01", "08:00"),
      novaDuracaoMin: 60,
    };
    const oc = expandirComRegras([estagio], [movida], [feriado], null, semana);
    expect(oc.find((o) => o.dataOriginal === "2026-12-01")?.movida).toBe(true);
  });
});

describe("conflito de horários", () => {
  it("acusa academia em cima de outro compromisso", () => {
    const outras = expandirComRegras([estagio, aula], [], [], null, semana);
    const academiaCedo = { ...academia, inicio: paraUtc("2026-08-03", "11:30") };
    const novas = expandirComRegras([academiaCedo], [], [], null, semana);
    const c = encontrarConflitos(novas, outras);
    expect(c).toHaveLength(5);
    expect(c[0].com.titulo).toBe("Estágio na Codevasf");
  });

  it("a rotina padrão não tem conflitos", () => {
    const todas = expandirComRegras([estagio, academia, aula], [], [], null, semana);
    const acad = todas.filter((o) => o.eventId === "acad");
    expect(encontrarConflitos(acad, todas)).toEqual([]);
  });

  it("encostar não é conflito (17:30 termina, 17:30 começa)", () => {
    const depois = { ...academia, id: "x", inicio: paraUtc("2026-08-03", "17:30") };
    const oc = expandirComRegras([academia, depois], [], [], null, semana);
    expect(
      encontrarConflitos(
        oc.filter((o) => o.eventId === "x"),
        oc,
      ),
    ).toEqual([]);
  });
});

describe("lembretes que repetem", () => {
  const quando = paraUtc("2026-10-15", "09:00");
  it("avança mantendo a hora local", () => {
    expect(proximaRepeticao(quando, "diario", paraUtc("2026-10-15", "10:00"))).toEqual(
      paraUtc("2026-10-16", "09:00"),
    );
    expect(proximaRepeticao(quando, "semanal", paraUtc("2026-10-15", "10:00"))).toEqual(
      paraUtc("2026-10-22", "09:00"),
    );
    expect(
      proximaRepeticao(paraUtc("2027-01-31", "09:00"), "mensal", paraUtc("2027-01-31", "10:00")),
    ).toEqual(paraUtc("2027-02-28", "09:00"));
  });
  it("pula repetições que já passaram e não repete o que é único", () => {
    expect(proximaRepeticao(quando, "diario", paraUtc("2026-10-20", "12:00"))).toEqual(
      paraUtc("2026-10-21", "09:00"),
    );
    expect(proximaRepeticao(quando, "nunca")).toBeNull();
  });
});
