import { describe, expect, it } from "vitest";
import { contagemRegressiva } from "./contagem";

const agora = new Date("2026-10-15T15:00:00Z"); // 12:00 em São Paulo

describe("contagem regressiva", () => {
  it("conta dias de calendário no fuso local", () => {
    expect(contagemRegressiva(new Date("2026-10-16T02:30:00Z"), agora).texto).toBe("hoje");
    expect(contagemRegressiva(new Date("2026-10-16T12:00:00Z"), agora).texto).toBe("amanhã");
    expect(contagemRegressiva(new Date("2026-10-18T12:00:00Z"), agora).texto).toBe("3 dias");
  });

  it("muda o tom com a proximidade", () => {
    expect(contagemRegressiva(new Date("2026-10-18T12:00:00Z"), agora).tom).toBe("urgente");
    expect(contagemRegressiva(new Date("2026-10-19T12:00:00Z"), agora).tom).toBe("proximo");
    expect(contagemRegressiva(new Date("2026-10-22T12:00:00Z"), agora).tom).toBe("proximo");
    expect(contagemRegressiva(new Date("2026-10-23T12:00:00Z"), agora).tom).toBe("distante");
  });

  it("marca prazos passados", () => {
    expect(contagemRegressiva(new Date("2026-10-14T12:00:00Z"), agora)).toEqual({
      dias: -1,
      texto: "ontem",
      tom: "passou",
    });
  });
});
