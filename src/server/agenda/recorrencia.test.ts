import { describe, expect, it } from "vitest";
import { paraUtc } from "@/lib/tempo";
import { expandirOcorrencias, minutosPorArea, type EventoParaExpandir } from "./recorrencia";

const semana = { de: "2026-10-19", ate: "2026-10-25" };

function evento(p: Partial<EventoParaExpandir> = {}): EventoParaExpandir {
  return {
    id: "e1",
    titulo: "Academia",
    areaId: "pessoal",
    inicio: paraUtc("2026-10-12", "16:00"),
    duracaoMin: 90,
    diaInteiro: false,
    fuso: "America/Sao_Paulo",
    diasSemana: [1, 2, 3, 4, 5],
    repeteDesde: "2026-10-12",
    repeteAte: null,
    ...p,
  };
}

describe("expansão de recorrência", () => {
  it("gera uma ocorrência por dia marcado, na hora local", () => {
    const oc = expandirOcorrencias([evento()], [], semana);
    expect(oc.map((o) => o.dataOriginal)).toEqual([
      "2026-10-19",
      "2026-10-20",
      "2026-10-21",
      "2026-10-22",
      "2026-10-23",
    ]);
    expect(oc[0].inicio.toISOString()).toBe("2026-10-19T19:00:00.000Z");
    expect(oc[0].fim.toISOString()).toBe("2026-10-19T20:30:00.000Z");
  });

  it("respeita início e fim da recorrência", () => {
    const oc = expandirOcorrencias(
      [evento({ repeteDesde: "2026-10-21", repeteAte: "2026-10-22" })],
      [],
      semana,
    );
    expect(oc.map((o) => o.dataOriginal)).toEqual(["2026-10-21", "2026-10-22"]);
  });

  it("não gera nada antes da primeira ocorrência", () => {
    const oc = expandirOcorrencias(
      [evento({ inicio: paraUtc("2026-10-23", "16:00") })],
      [],
      semana,
    );
    expect(oc.map((o) => o.dataOriginal)).toEqual(["2026-10-23"]);
  });

  it("evento único só aparece no seu dia", () => {
    const unico = evento({
      diasSemana: null,
      repeteDesde: null,
      inicio: paraUtc("2026-10-22", "10:00"),
    });
    expect(expandirOcorrencias([unico], [], semana)).toHaveLength(1);
    expect(expandirOcorrencias([unico], [], { de: "2026-10-26", ate: "2026-11-01" })).toHaveLength(
      0,
    );
  });

  it("dia inteiro começa à meia-noite local", () => {
    const feriado = evento({
      diasSemana: null,
      diaInteiro: true,
      duracaoMin: 1440,
      inicio: paraUtc("2026-11-02", "00:00"),
    });
    const [o] = expandirOcorrencias([feriado], [], { de: "2026-11-02", ate: "2026-11-02" });
    expect(o.inicio.toISOString()).toBe("2026-11-02T03:00:00.000Z");
    expect(o.diaInteiro).toBe(true);
  });

  it("ordena por horário", () => {
    const aula = evento({
      id: "e2",
      titulo: "Cálculo",
      areaId: "aulas",
      inicio: paraUtc("2026-10-14", "19:10"),
      diasSemana: [3],
    });
    const estagio = evento({
      id: "e3",
      titulo: "Estágio",
      areaId: "estagio",
      inicio: paraUtc("2026-10-12", "07:30"),
    });
    const oc = expandirOcorrencias([aula, evento(), estagio], [], {
      de: "2026-10-21",
      ate: "2026-10-21",
    });
    expect(oc.map((o) => o.titulo)).toEqual(["Estágio", "Academia", "Cálculo"]);
  });
});

describe("exceções", () => {
  it("feriado cancela só a ocorrência daquele dia", () => {
    const oc = expandirOcorrencias(
      [evento()],
      [
        {
          eventId: "e1",
          data: "2026-10-21",
          tipo: "cancelada",
          novoInicio: null,
          novaDuracaoMin: null,
        },
      ],
      semana,
    );
    expect(oc.map((o) => o.dataOriginal)).not.toContain("2026-10-21");
    expect(oc).toHaveLength(4);
  });

  it("mudança de um dia só troca o horário daquela ocorrência", () => {
    const oc = expandirOcorrencias(
      [evento()],
      [
        {
          eventId: "e1",
          data: "2026-10-20",
          tipo: "movida",
          novoInicio: paraUtc("2026-10-20", "13:00"),
          novaDuracaoMin: 60,
        },
      ],
      semana,
    );
    const terca = oc.find((o) => o.dataOriginal === "2026-10-20")!;
    expect(terca.movida).toBe(true);
    expect(terca.inicio.toISOString()).toBe("2026-10-20T16:00:00.000Z");
    expect(terca.fim.toISOString()).toBe("2026-10-20T17:00:00.000Z");
    expect(
      oc.filter((o) => !o.movida).every((o) => o.inicio.toISOString().endsWith("T19:00:00.000Z")),
    ).toBe(true);
  });

  it("ocorrência movida para outra semana aparece na semana nova", () => {
    const x = {
      eventId: "e1",
      data: "2026-10-23",
      tipo: "movida" as const,
      novoInicio: paraUtc("2026-10-24", "10:00"),
      novaDuracaoMin: null,
    };
    const oc = expandirOcorrencias([evento()], [x], { de: "2026-10-24", ate: "2026-10-24" });
    expect(oc).toHaveLength(1);
    expect(oc[0].dataOriginal).toBe("2026-10-23");
    expect(oc[0].fim.getTime() - oc[0].inicio.getTime()).toBe(90 * 60_000);
  });

  it("ignora exceção em data em que o evento não acontece", () => {
    const x = {
      eventId: "e1",
      data: "2026-10-25",
      tipo: "movida" as const,
      novoInicio: paraUtc("2026-10-25", "10:00"),
      novaDuracaoMin: null,
    };
    expect(
      expandirOcorrencias([evento()], [x], { de: "2026-10-25", ate: "2026-10-25" }),
    ).toHaveLength(0);
  });
});

describe("horas por área", () => {
  it("soma minutos planejados e ignora dia inteiro", () => {
    const feriado = evento({
      id: "f",
      diasSemana: null,
      diaInteiro: true,
      duracaoMin: 1440,
      areaId: "provas",
      inicio: paraUtc("2026-10-21", "00:00"),
    });
    const total = minutosPorArea(expandirOcorrencias([evento(), feriado], [], semana));
    expect(total.pessoal).toBe(450);
    expect(total.provas).toBe(0);
  });
});
