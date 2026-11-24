import { describe, expect, it } from "vitest";
import { ajustesSchema, blocosPlanoSchema, eventoSchema, intervaloSchema } from "./validacao";

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

describe("blocos do plano em Ajustes", () => {
  const padrao = {
    dias_uteis: {
      manha: { inicio: "08:00" },
      teoria: { inicio: "13:30", minutos: 90 },
      projeto: { inicio: "17:20", minutos: 80 },
    },
    sabado: { teoria: { inicio: "10:00", minutos: 120, ligado: true } },
  };

  it("aceita o formato da especificação, com fim de semana opcional", () => {
    expect(blocosPlanoSchema.parse(padrao)).toEqual(padrao);
    expect(
      ajustesSchema.parse({ blocosPlano: padrao, perguntaFolga: "07:40", avisoBlocosMin: 5 }),
    ).toMatchObject({ perguntaFolga: "07:40", avisoBlocosMin: 5 });
    expect(ajustesSchema.parse({ blocosPlano: null }).blocosPlano).toBeNull();
  });

  it.each([
    ["horário 25:00", { dias_uteis: { teoria: { inicio: "25:00", minutos: 90 } } }],
    ["horário sem zero", { dias_uteis: { teoria: { inicio: "7:00" } } }],
    ["minutos 0", { dias_uteis: { teoria: { inicio: "13:30", minutos: 0 } } }],
    ["minutos 500", { dias_uteis: { projeto: { inicio: "17:20", minutos: 500 } } }],
    ["minutos quebrados", { sabado: { teoria: { inicio: "10:00", minutos: 60.5 } } }],
    ["bloco desconhecido", { dias_uteis: { almoco: { inicio: "12:00" } } }],
    ["dia desconhecido", { segunda: { teoria: { inicio: "13:30" } } }],
    ["campo extra", { dias_uteis: { teoria: { inicio: "13:30", extra: true } } }],
    ["ligado que não é boolean", { sabado: { teoria: { inicio: "10:00", ligado: "sim" } } }],
  ])("recusa %s", (_nome, blocos) => {
    expect(blocosPlanoSchema.safeParse(blocos).success).toBe(false);
    expect(ajustesSchema.safeParse({ blocosPlano: blocos }).success).toBe(false);
  });

  it("recusa pergunta da folga e aviso fora do formato", () => {
    expect(ajustesSchema.safeParse({ perguntaFolga: "25:00" }).success).toBe(false);
    expect(ajustesSchema.safeParse({ avisoBlocosMin: -1 }).success).toBe(false);
    expect(ajustesSchema.safeParse({ avisoBlocosMin: 1441 }).success).toBe(false);
  });
});
