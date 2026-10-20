import { describe, expect, it } from "vitest";
import {
  dataNumerica,
  diasAte,
  indiceFaseAtual,
  naSemanaZero,
  percentual,
  periodoTexto,
  semanasDoPeriodo,
  textoFaltam,
} from "./roadmap";

const FASES = [
  { inicio: "2026-10-26", fim: "2027-03-07" },
  { inicio: "2027-03-08", fim: "2027-06-06" },
  { inicio: "2027-06-07", fim: "2027-08-01" },
  { inicio: "2027-08-02", fim: "2027-09-26" },
];
const SEMANA_ZERO = { inicio: "2026-10-19", fim: "2026-10-25" };

describe("fase atual", () => {
  it("antes da primeira fase, a atual é a primeira", () => {
    expect(indiceFaseAtual(FASES, "2026-10-20")).toBe(0);
    expect(indiceFaseAtual(FASES, "2026-01-01")).toBe(0);
  });

  it("é a fase cujo intervalo contém hoje, com as bordas inclusivas", () => {
    expect(indiceFaseAtual(FASES, "2026-10-26")).toBe(0);
    expect(indiceFaseAtual(FASES, "2027-03-07")).toBe(0);
    expect(indiceFaseAtual(FASES, "2027-03-08")).toBe(1);
    expect(indiceFaseAtual(FASES, "2027-07-15")).toBe(2);
    expect(indiceFaseAtual(FASES, "2027-09-26")).toBe(3);
  });

  it("depois da última, continua na última; num intervalo, vai para a próxima", () => {
    expect(indiceFaseAtual(FASES, "2028-01-01")).toBe(3);
    const comBuraco = [FASES[0], { inicio: "2027-03-15", fim: "2027-06-06" }];
    expect(indiceFaseAtual(comBuraco, "2027-03-10")).toBe(1);
    expect(indiceFaseAtual([], "2027-03-10")).toBe(-1);
  });

  it("'Você está aqui' só dentro da semana zero", () => {
    expect(naSemanaZero(SEMANA_ZERO, "2026-10-18")).toBe(false);
    expect(naSemanaZero(SEMANA_ZERO, "2026-10-19")).toBe(true);
    expect(naSemanaZero(SEMANA_ZERO, "2026-10-25")).toBe(true);
    expect(naSemanaZero(SEMANA_ZERO, "2026-10-26")).toBe(false);
    expect(naSemanaZero(null, "2026-10-20")).toBe(false);
  });
});

describe("percentual", () => {
  it("arredonda e fica entre 0 e 100", () => {
    expect(percentual(2, 14)).toBe(14);
    expect(percentual(7, 14)).toBe(50);
    expect(percentual(1, 3)).toBe(33);
    expect(percentual(20, 14)).toBe(100);
    expect(percentual(0, 0)).toBe(0);
  });
});

describe("contagem regressiva do portão", () => {
  it("conta dias de calendário em São Paulo", () => {
    // 20/10/2026 às 23:30 em São Paulo (02:30 UTC do dia 21): ainda é dia 20.
    const tarde = new Date("2026-10-21T02:30:00Z");
    expect(diasAte("2027-03-05", tarde)).toBe(136);
    // Meia-noite e meia do dia 21 em São Paulo.
    expect(diasAte("2027-03-05", new Date("2026-10-21T03:30:00Z"))).toBe(135);
    expect(diasAte("2026-10-20", tarde)).toBe(0);
  });

  it("escreve o texto do prazo", () => {
    expect(textoFaltam(136)).toBe("Faltam 136 dias");
    expect(textoFaltam(1)).toBe("Falta 1 dia");
    expect(textoFaltam(0)).toBe("É hoje");
    expect(textoFaltam(-1)).toBe("Foi ontem");
    expect(textoFaltam(-5)).toBe("Foi há 5 dias");
  });
});

describe("períodos", () => {
  it("as quatro fases da DevOps somam 48 semanas", () => {
    expect(FASES.map(semanasDoPeriodo)).toEqual([19, 13, 8, 8]);
  });

  it("formata datas", () => {
    expect(dataNumerica("2027-03-05")).toBe("05/03");
    expect(periodoTexto(FASES[0])).toBe("26/10/2026 a 07/03/2027");
  });
});
