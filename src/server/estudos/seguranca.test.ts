import { describe, expect, it } from "vitest";
import { HORARIOS_PADRAO } from "@/lib/estudos";
import { addDias, diaDaSemana, hmParaMin } from "@/lib/tempo";
import { PAUSAS_DA_SEGURANCA } from "../roadmap/compartilhamento";
import diaria from "../roadmap/trilhas/seguranca-diaria.json";
import { COMPROMISSOS } from "../rotina/seed";
import { BLOCO_SEGURANCA, FASES_SEGURANCA, tarefaDaSeguranca } from "./seguranca";
import { sessoesDaDevops } from "./trilha";

describe("trilha Segurança", () => {
  it("tem as quatro fases do Roadmap, cada uma com o seu portão", () => {
    expect(FASES_SEGURANCA.map((f) => [f.id, f.curto, f.prova])).toEqual([
      [1, "Fundamentos", "Base"],
      [2, "SecOps", "SOC"],
      [3, "Ofensiva", "Web"],
      [4, "Security+", "Security+"],
    ]);
  });

  it("estuda de segunda a sexta, das 17:30 às 18:40, no bloco Ciber e SecOps", () => {
    expect(BLOCO_SEGURANCA).toEqual({
      titulo: "Ciber e SecOps",
      dias: [1, 2, 3, 4, 5],
      hora: "17:30",
      minutos: 70,
    });
  });

  it("não cruza com estágio, academia, aulas nem com a DevOps (que fica com todas as tardes)", () => {
    const ocupados = [
      ...COMPROMISSOS.flatMap((c) =>
        c.dias.map((dia) => ({ dia, ini: hmParaMin(c.hora), fim: hmParaMin(c.hora) + c.minutos })),
      ),
      ...Object.entries(HORARIOS_PADRAO).map(([chave, h]) => ({
        dia: Number(chave.split("-")[0]),
        ini: hmParaMin(h.inicio),
        fim: hmParaMin(h.inicio) + h.minutos,
      })),
    ];
    const ini = hmParaMin(BLOCO_SEGURANCA.hora);
    const fim = ini + BLOCO_SEGURANCA.minutos;
    for (const dia of BLOCO_SEGURANCA.dias) {
      const cruza = ocupados.filter((o) => o.dia === dia && ini < o.fim && o.ini < fim);
      expect(cruza, `bloco de ${dia}`).toEqual([]);
    }
  });

  it("a DevOps fica com as tardes de segunda a sexta, inclusive nas semanas leves", () => {
    const tardes = (de: string, ate: string) =>
      sessoesDaDevops(de, ate)
        .filter((s) => s.turno === "tarde")
        .map((s) => [s.data, s.categoria]);
    expect(tardes("2026-11-09", "2026-11-15")).toEqual([
      ["2026-11-09", "pratica"],
      ["2026-11-10", "pratica"],
      ["2026-11-11", "pratica"],
      ["2026-11-12", "pratica"],
      ["2026-11-13", "reposicao"],
    ]);
    const leve = PAUSAS_DA_SEGURANCA[0];
    expect(tardes(leve.inicio, addDias(leve.inicio, 6))).toHaveLength(5);
  });

  it("trilha diária: 264 sessões de 20/10/2026 a 22/10/2027, só de segunda a sexta", () => {
    expect(diaria).toHaveLength(264);
    expect(diaria[0]).toEqual({
      data: "2026-10-20",
      semana: 1,
      tema: "O mapa da segurança",
      tarefa: "Conta no TryHackMe, módulo 1 do Cisco e caderno de erros",
    });
    expect(diaria.at(-1)!.data).toBe("2027-10-22");
    expect(new Set(diaria.map((d) => d.data)).size).toBe(264);
    expect(diaria.every((d) => diaDaSemana(d.data) >= 1 && diaDaSemana(d.data) <= 5)).toBe(true);
    expect(new Set(diaria.map((d) => d.semana)).size).toBe(53);
  });

  it("acha a tarefa do dia (e nada no fim de semana ou fora da trilha)", () => {
    expect(tarefaDaSeguranca("2026-10-27")?.tarefa).toBe("Bandit, níveis 4 a 6");
    expect(tarefaDaSeguranca("2026-10-31")).toBeNull();
    expect(tarefaDaSeguranca("2026-10-19")).toBeNull();
    expect(tarefaDaSeguranca("2027-10-25")).toBeNull();
  });
});
