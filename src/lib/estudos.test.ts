import { describe, expect, it } from "vitest";
import { dataDeRevisao, errosDaSemana, HORARIOS_PADRAO, horariosComPadrao } from "./estudos";

describe("caderno de erros", () => {
  // Erro anotado na revisão de sexta da semana 2 (06/11/2026).
  const erro = { id: "e", revisarEm: dataDeRevisao("2026-11-06"), resolvidoEm: null };

  it("a revisão fica para 21 dias depois", () => {
    expect(erro.revisarEm).toBe("2026-11-27");
  });

  it("aparece no domingo três semanas depois, e não antes", () => {
    expect(errosDaSemana([erro], "2026-11-15")).toEqual([]);
    expect(errosDaSemana([erro], "2026-11-22")).toEqual([]);
    expect(errosDaSemana([erro], "2026-11-29")).toEqual([erro]);
  });

  it("continua na lista enquanto não for acertado, e sai quando for", () => {
    expect(errosDaSemana([erro], "2026-12-06")).toEqual([erro]);
    expect(errosDaSemana([{ ...erro, resolvidoEm: new Date() }], "2026-11-29")).toEqual([]);
  });
});

describe("horários de estudo", () => {
  it("sem nada gravado, vale o padrão de 19 h por semana", () => {
    const h = horariosComPadrao(null);
    expect(h).toEqual(HORARIOS_PADRAO);
    expect(Object.values(h).reduce((t, x) => t + (x.ativo ? x.minutos : 0), 0)).toBe(1140);
  });

  it("horários da versão 1 (um por dia) continuam valendo no turno equivalente", () => {
    const h = horariosComPadrao({
      "1": { ativo: true, inicio: "15:00", minutos: 60 },
      "5": { ativo: false, inicio: "14:00", minutos: 60 },
      "0": { ativo: true, inicio: "20:00", minutos: 60 },
    });
    expect(h["1-tarde"]).toEqual({ ativo: true, inicio: "15:00", minutos: 60 });
    expect(h["1-manha"]).toEqual(HORARIOS_PADRAO["1-manha"]);
    expect(h["5-manha"]).toEqual(HORARIOS_PADRAO["5-manha"]);
    // A sexta da versão 1 (desligada) não desliga a reposição nova da tarde de sexta.
    expect(h["5-tarde"]).toEqual(HORARIOS_PADRAO["5-tarde"]);
    expect(h["0-noite"].inicio).toBe("20:00");
    expect(Object.keys(h)).toHaveLength(12);
  });
});
