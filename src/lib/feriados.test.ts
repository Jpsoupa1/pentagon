import { describe, expect, it } from "vitest";
import { feriadosNacionais, pascoa } from "./feriados";

describe("feriados nacionais", () => {
  it("calcula a Páscoa", () => {
    expect(pascoa(2026)).toBe("2026-04-05");
    expect(pascoa(2027)).toBe("2027-03-28");
  });
  it("datas móveis a partir da Páscoa", () => {
    const f = Object.fromEntries(feriadosNacionais(2027).map((x) => [x.nome + x.data, x.data]));
    expect(Object.values(f)).toContain("2027-02-08"); // Carnaval segunda
    expect(Object.values(f)).toContain("2027-02-09"); // Carnaval terça
    expect(Object.values(f)).toContain("2027-03-26"); // Sexta-feira Santa
    expect(Object.values(f)).toContain("2027-05-27"); // Corpus Christi
  });
});
