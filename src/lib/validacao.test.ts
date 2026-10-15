import { describe, expect, it } from "vitest";
import { eventoSchema, intervaloSchema } from "./validacao";

describe("validação", () => {
  it("normaliza dias da semana e campos vazios", () => {
    const e = eventoSchema.parse({
      titulo: " Academia ",
      areaId: "pessoal",
      data: "2026-10-19",
      hora: "16:00",
      duracaoMin: 90,
      diasSemana: [5, 1, 1, 3],
      local: "",
    });
    expect(e.titulo).toBe("Academia");
    expect(e.diasSemana).toEqual([1, 3, 5]);
    expect(e.local).toBeNull();
  });

  it("rejeita hora fora do formato 24 h", () => {
    expect(() =>
      eventoSchema.parse({
        titulo: "x",
        areaId: "aulas",
        data: "2026-10-19",
        hora: "7:10 PM",
        duracaoMin: 60,
      }),
    ).toThrow();
  });

  it("limita o intervalo da agenda", () => {
    expect(intervaloSchema.safeParse({ de: "2026-10-19", ate: "2026-10-25" }).success).toBe(true);
    expect(intervaloSchema.safeParse({ de: "2026-10-25", ate: "2026-10-19" }).success).toBe(false);
    expect(intervaloSchema.safeParse({ de: "2026-01-01", ate: "2026-12-31" }).success).toBe(false);
  });
});
