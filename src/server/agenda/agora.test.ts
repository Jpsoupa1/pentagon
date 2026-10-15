import { describe, expect, it } from "vitest";
import { paraUtc } from "@/lib/tempo";
import { agoraEProximo } from "./agora";
import { expandirOcorrencias, type EventoParaExpandir } from "./recorrencia";

const base = {
  fuso: "America/Sao_Paulo",
  diaInteiro: false,
  repeteDesde: null,
  repeteAte: null,
  diasSemana: null,
} as const;
const eventos: EventoParaExpandir[] = [
  {
    ...base,
    id: "a",
    titulo: "Estágio",
    areaId: "estagio",
    inicio: paraUtc("2026-10-19", "07:30"),
    duracaoMin: 270,
  },
  {
    ...base,
    id: "b",
    titulo: "Academia",
    areaId: "pessoal",
    inicio: paraUtc("2026-10-19", "16:00"),
    duracaoMin: 90,
  },
];
const dia = expandirOcorrencias([...eventos], [], { de: "2026-10-19", ate: "2026-10-19" });

describe("cartão Agora", () => {
  it("mostra o compromisso em andamento com progresso", () => {
    const r = agoraEProximo(dia, paraUtc("2026-10-19", "09:45"));
    expect(r.atual?.titulo).toBe("Estágio");
    expect(r.atual?.progresso).toBeCloseTo(0.5);
    expect(r.atual?.restanteMin).toBe(135);
    expect(r.proximo?.titulo).toBe("Academia");
  });

  it("entre compromissos mostra só o próximo", () => {
    const r = agoraEProximo(dia, paraUtc("2026-10-19", "13:00"));
    expect(r.atual).toBeNull();
    expect(r.proximo?.titulo).toBe("Academia");
  });

  it("depois do último não há nada", () => {
    expect(agoraEProximo(dia, paraUtc("2026-10-19", "23:00"))).toEqual({
      atual: null,
      proximo: null,
    });
  });
});
