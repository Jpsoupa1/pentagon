import { describe, expect, it } from "vitest";
import { paraUtc } from "@/lib/tempo";
import { expandirOcorrencias } from "../agenda/recorrencia";
import { eventosDeCompromissos } from "./agenda";
import { gerarCalendario } from "./ics";

const fuso = "America/Sao_Paulo";
const ocorrencias = expandirOcorrencias(
  [
    {
      id: "e1",
      titulo: "Leitura de SRE",
      areaId: "estudos",
      inicio: paraUtc("2026-10-19", "20:00"),
      duracaoMin: 45,
      diaInteiro: false,
      fuso,
      diasSemana: [1, 3],
      repeteDesde: "2026-10-19",
      repeteAte: null,
      local: "Biblioteca",
    },
  ],
  [
    {
      eventId: "e1",
      data: "2026-10-21",
      tipo: "cancelada",
      novoInicio: null,
      novaDuracaoMin: null,
    },
  ],
  { de: "2026-10-19", ate: "2026-10-25" },
);

describe("compromissos no feed", () => {
  it("vira um evento por ocorrência, com exceções aplicadas e alerta do compromisso", () => {
    const eventos = eventosDeCompromissos(ocorrencias, {
      fuso,
      avisoPadrao: 10,
      lembrarPorEvento: new Map([["e1", 30]]),
    });
    expect(eventos).toHaveLength(1);
    const ics = gerarCalendario({
      nome: "Pentagon",
      fuso,
      eventos,
      agora: new Date("2026-10-15T12:00:00Z"),
    });
    expect(ics).toContain("UID:e1-2026-10-19@pentagon");
    expect(ics).toContain("DTSTART;TZID=America/Sao_Paulo:20261019T200000");
    expect(ics).toContain("DTEND;TZID=America/Sao_Paulo:20261019T204500");
    expect(ics).toContain("TRIGGER:-PT30M");
    expect(ics).toContain("DESCRIPTION:Biblioteca");
  });

  it("sem 'lembrar antes' usa a antecedência de Ajustes", () => {
    const [e] = eventosDeCompromissos(ocorrencias, {
      fuso,
      avisoPadrao: 10,
      lembrarPorEvento: new Map(),
    });
    expect(e.tipo === "hora" && e.alarmeMin).toBe(10);
  });
});

describe("provas e feriados no feed", () => {
  it("prova vira evento de 1 h com alerta na véspera e horas antes", async () => {
    const { eventosDeAvaliacoes } = await import("./agenda");
    const eventos = eventosDeAvaliacoes(
      [
        {
          id: "p1",
          tipo: "prova",
          titulo: "Prova 1",
          sigla: "CALC",
          entregaEm: paraUtc("2026-10-21", "19:10"),
          lembrarMin: 120,
        },
      ],
      fuso,
      10,
    );
    const ics = gerarCalendario({
      nome: "Pentagon",
      fuso,
      eventos,
      agora: new Date("2026-10-15T12:00:00Z"),
    });
    expect(ics).toContain("SUMMARY:Prova CALC: Prova 1");
    expect(ics).toContain("DTEND;TZID=America/Sao_Paulo:20261021T201000");
    expect(ics).toContain("TRIGGER:-P1D");
    expect(ics).toContain("TRIGGER:-PT120M");
  });

  it("feriado entra como dia inteiro", async () => {
    const { eventosDeFeriados } = await import("./agenda");
    const ics = gerarCalendario({
      nome: "Pentagon",
      fuso,
      eventos: eventosDeFeriados([{ data: "2026-11-02", nome: "Finados" }]),
    });
    expect(ics).toContain("DTSTART;VALUE=DATE:20261102");
    expect(ics).toContain("SUMMARY:Feriado: Finados");
  });
});
