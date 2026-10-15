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
