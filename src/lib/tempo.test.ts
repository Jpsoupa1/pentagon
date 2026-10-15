import { describe, expect, it } from "vitest";
import {
  addDias,
  dataLonga,
  diaDaSemana,
  hojeLocal,
  paraUtc,
  partesLocais,
  segundaDe,
} from "./tempo";

describe("tempo", () => {
  it("converte hora de São Paulo para UTC (UTC−3)", () => {
    expect(paraUtc("2026-10-19", "19:10").toISOString()).toBe("2026-10-19T22:10:00.000Z");
  });

  it("lê data e hora locais de um instante UTC", () => {
    const p = partesLocais(new Date("2026-10-20T01:30:00Z"));
    expect(p).toEqual({ data: "2026-10-19", hora: "22:30", minutos: 1350, diaSemana: 1 });
  });

  it("hoje depende do fuso, não do aparelho", () => {
    expect(hojeLocal(new Date("2026-10-16T02:00:00Z"))).toBe("2026-10-15");
  });

  it("aritmética de datas", () => {
    expect(addDias("2026-12-31", 1)).toBe("2027-01-01");
    expect(diaDaSemana("2026-10-12")).toBe(1);
    expect(segundaDe("2026-10-18")).toBe("2026-10-12");
    expect(dataLonga("2026-10-15")).toBe("Quinta, 15 de outubro");
  });
});
