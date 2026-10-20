import { describe, expect, it } from "vitest";
import {
  dataNumerica,
  diasAte,
  estacaoInicial,
  indiceFaseAtual,
  pausaEm,
  percentual,
  periodoTexto,
  semanasDoPeriodo,
  separarNumero,
  textoFaltam,
} from "./roadmap";

const FASES = [
  { inicio: "2026-10-26", fim: "2027-03-07" },
  { inicio: "2027-03-08", fim: "2027-06-06" },
  { inicio: "2027-06-07", fim: "2027-08-01" },
  { inicio: "2027-08-02", fim: "2027-09-26" },
];

// Trilha Segurança: quatro fases e quatro pausas para as provas da DevOps.
const SEG = [
  { inicio: "2026-10-19", fim: "2027-02-14" },
  { inicio: "2027-03-08", fim: "2027-05-16" },
  { inicio: "2027-06-07", fim: "2027-07-18" },
  { inicio: "2027-08-02", fim: "2027-10-24" },
];
const PAUSAS = [
  { inicio: "2026-10-26", fim: "2026-11-08" },
  { inicio: "2027-02-15", fim: "2027-03-07" },
  { inicio: "2027-05-17", fim: "2027-06-06" },
  { inicio: "2027-07-19", fim: "2027-08-01" },
];

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
});

describe("fase atual com pausas (Segurança)", () => {
  it("dentro de cada pausa, continua a fase que começou antes dela", () => {
    expect(indiceFaseAtual(SEG, "2026-11-01", PAUSAS)).toBe(0); // Revisão CKA, no meio da Fase 1
    expect(indiceFaseAtual(SEG, "2027-02-20", PAUSAS)).toBe(0); // Pausa CKA, depois do fim da Fase 1
    expect(indiceFaseAtual(SEG, "2027-05-20", PAUSAS)).toBe(1); // Pausa AWS SAA
    expect(indiceFaseAtual(SEG, "2027-07-25", PAUSAS)).toBe(2); // Pausa Terraform
  });

  it("no dia seguinte a cada pausa, vale a fase do calendário", () => {
    expect(indiceFaseAtual(SEG, "2026-11-09", PAUSAS)).toBe(0);
    expect(indiceFaseAtual(SEG, "2027-03-08", PAUSAS)).toBe(1);
    expect(indiceFaseAtual(SEG, "2027-06-07", PAUSAS)).toBe(2);
    expect(indiceFaseAtual(SEG, "2027-08-02", PAUSAS)).toBe(3);
  });

  it("sem pausas, um intervalo entre fases aponta para a próxima", () => {
    expect(indiceFaseAtual(SEG, "2027-02-20")).toBe(1);
  });

  it("acha a pausa do dia", () => {
    expect(pausaEm(PAUSAS, "2026-11-08")).toBe(PAUSAS[0]);
    expect(pausaEm(PAUSAS, "2026-11-09")).toBeNull();
  });
});

describe("estação inicial", () => {
  it("antes do começo mostra em quantos dias a trilha começa", () => {
    expect(estacaoInicial("2026-10-19", "2026-10-19", "2026-10-10")).toEqual({
      tipo: "antes",
      dias: 9,
    });
    expect(estacaoInicial("2026-10-19", "2026-10-19", "2026-10-18")).toEqual({
      tipo: "antes",
      dias: 1,
    });
  });

  it("Segurança: começa com a Fase 1, então 'Você está aqui' vale a primeira semana", () => {
    expect(estacaoInicial("2026-10-19", "2026-10-19", "2026-10-19")).toEqual({ tipo: "aqui" });
    expect(estacaoInicial("2026-10-19", "2026-10-19", "2026-10-25")).toEqual({ tipo: "aqui" });
    expect(estacaoInicial("2026-10-19", "2026-10-19", "2026-10-26")).toBeNull();
  });

  it("DevOps: 'Você está aqui' até a véspera da Fase 1", () => {
    expect(estacaoInicial("2026-10-19", "2026-10-26", "2026-10-20")).toEqual({ tipo: "aqui" });
    expect(estacaoInicial("2026-10-19", "2026-10-26", "2026-10-25")).toEqual({ tipo: "aqui" });
    expect(estacaoInicial("2026-10-19", "2026-10-26", "2026-10-26")).toBeNull();
  });
});

describe("números do cabeçalho", () => {
  it("separa o número do rótulo", () => {
    expect(separarNumero("4 fases")).toEqual({ numero: "4", rotulo: "fases" });
    expect(separarNumero("17 h 30 por semana")).toEqual({
      numero: "17 h 30",
      rotulo: "por semana",
    });
    expect(separarNumero("5 h por semana")).toEqual({ numero: "5 h", rotulo: "por semana" });
    expect(separarNumero("1 certificação no núcleo")).toEqual({
      numero: "1",
      rotulo: "certificação no núcleo",
    });
    expect(separarNumero("sem prazo")).toEqual({ numero: "", rotulo: "sem prazo" });
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
