import { describe, expect, it } from "vitest";
import { carregarCatalogo, montarBlocos } from "@/lib/plano";
import { paraUtc } from "@/lib/tempo";
import seed from "../plano/plano.json";
import { ocorrenciaDoBloco } from "./blocos";
import type { EventoParaExpandir } from "./recorrencia";
import { encontrarConflitos, expandirComRegras, marcarNoEstagio } from "./regras";

const fuso = "America/Sao_Paulo";
const DIA = "2026-11-24";
const intervalo = { de: DIA, ate: DIA };
const cat = carregarCatalogo(seed);

const blocos = (folga: number | null = null) =>
  montarBlocos({
    cat,
    feitos: new Set(["A0", "A1"]),
    ajustes: null,
    intervalo,
    folgas: new Map(folga ? [[DIA, folga]] : []),
    registros: [],
  }).map((b) => ocorrenciaDoBloco(b, fuso));

const compromisso = (
  id: string,
  areaId: EventoParaExpandir["areaId"],
  hora: string,
  minutos: number,
) =>
  expandirComRegras(
    [
      {
        id,
        titulo: id,
        areaId,
        inicio: paraUtc(DIA, hora, fuso),
        duracaoMin: minutos,
        diaInteiro: false,
        fuso,
        diasSemana: null,
        repeteDesde: null,
        repeteAte: null,
      },
    ],
    [],
    [],
    null,
    intervalo,
  );

describe("blocos do plano na agenda", () => {
  it("viram ocorrências da área estudos com o título do conteúdo", () => {
    const [teoria, projeto] = blocos();
    expect(teoria).toMatchObject({
      chave: "bloco:2026-11-24:teoria",
      origem: "bloco",
      areaId: "estudos",
      titulo: "Bloco Teoria: A2. Cálculo de uma variável",
      inicio: paraUtc(DIA, "13:30", fuso),
      fim: paraUtc(DIA, "15:00", fuso),
      diaInteiro: false,
    });
    expect(projeto.fim).toEqual(paraUtc(DIA, "18:40", fuso));
  });

  it("Teoria e Projeto geram conflito com um compromisso no mesmo horário", () => {
    const [teoria, projeto] = blocos();
    const reuniao = compromisso("Reunião", "pessoal", "14:00", 60);
    expect(encontrarConflitos(reuniao, [teoria, projeto]).map((c) => c.com.chave)).toEqual([
      "bloco:2026-11-24:teoria",
    ]);
    const revisao = compromisso("Revisão", "aulas", "18:00", 60);
    expect(encontrarConflitos(revisao, [teoria, projeto]).map((c) => c.com.chave)).toEqual([
      "bloco:2026-11-24:projeto",
    ]);
  });

  it("a Academia de 80 min (16:00 a 17:20) não choca com o Projeto das 17:20", () => {
    expect(encontrarConflitos(compromisso("Academia", "pessoal", "16:00", 80), blocos())).toEqual(
      [],
    );
    // Com os 90 min antigos haveria choque: é por isso que a duração mudou.
    expect(
      encontrarConflitos(compromisso("Academia", "pessoal", "16:00", 90), blocos()),
    ).toHaveLength(1);
  });

  it("a manhã com folga não choca com o estágio, mas choca com o que não é estágio", () => {
    const [manha] = blocos(120);
    expect(manha.chave).toBe("bloco:2026-11-24:manha");
    const estagio = compromisso("Estágio", "estagio", "07:30", 270);
    expect(encontrarConflitos(estagio, [manha])).toEqual([]);
    expect(encontrarConflitos([manha], estagio)).toEqual([]);
    const medico = compromisso("Médico", "pessoal", "08:30", 30);
    expect(encontrarConflitos(medico, [manha])).toHaveLength(1);
  });

  it('a manhã dentro do estágio leva o selo "no estágio"', () => {
    const [manha] = blocos(120);
    const estagio = compromisso("Estágio", "estagio", "07:30", 270);
    const marcadas = marcarNoEstagio([...estagio, manha]);
    expect(marcadas.find((o) => o.origem === "bloco")?.noEstagio).toBe(true);
  });

  it("bloco feito não conta como conflito, como a sessão feita", () => {
    const [teoria] = blocos();
    const reuniao = compromisso("Reunião", "pessoal", "14:00", 60);
    expect(encontrarConflitos(reuniao, [{ ...teoria, feita: true }])).toEqual([]);
  });
});

describe("blocos em outro fuso", () => {
  it("23:00 com 120 min em Tokyo vira o dia: início e fim em UTC", () => {
    const b = montarBlocos({
      cat,
      feitos: new Set(["A0", "A1"]),
      ajustes: { dias_uteis: { teoria: { inicio: "23:00", minutos: 120 } } },
      intervalo,
      folgas: new Map(),
      registros: [],
    }).find((x) => x.bloco === "teoria")!;
    const o = ocorrenciaDoBloco(b, "Asia/Tokyo");
    expect(o.inicio.toISOString()).toBe("2026-11-24T14:00:00.000Z");
    expect(o.fim.toISOString()).toBe("2026-11-24T16:00:00.000Z");
    expect(o.dataOriginal).toBe(DIA);
  });
});
