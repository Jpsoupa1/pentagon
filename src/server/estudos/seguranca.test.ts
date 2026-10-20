import { describe, expect, it } from "vitest";
import { HORARIOS_PADRAO } from "@/lib/estudos";
import { hmParaMin } from "@/lib/tempo";
import { turnoCedidoASeguranca } from "../roadmap/compartilhamento";
import { COMPROMISSOS } from "../rotina/seed";
import { datasEmPausa, FASES_SEGURANCA, SESSOES_SEGURANCA } from "./seguranca";
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

  it("estuda nas tardes de terça e quinta e no sábado à tarde (5 h por semana)", () => {
    expect(SESSOES_SEGURANCA.map((s) => [s.dia, s.hora])).toEqual([
      [2, "14:00"],
      [4, "14:00"],
      [6, "14:00"],
    ]);
    expect(SESSOES_SEGURANCA.reduce((t, s) => t + s.minutos, 0)).toBe(300);
  });

  it("não cruza com estágio, academia, aulas nem com o que sobra da DevOps", () => {
    const ocupados = [
      ...COMPROMISSOS.flatMap((c) =>
        c.dias.map((dia) => ({ dia, ini: hmParaMin(c.hora), fim: hmParaMin(c.hora) + c.minutos })),
      ),
      // As tardes de terça e quinta da DevOps são justamente as cedidas à Segurança.
      ...Object.entries(HORARIOS_PADRAO)
        .filter(([chave]) => chave !== "2-tarde" && chave !== "4-tarde")
        .map(([chave, h]) => ({
          dia: Number(chave.split("-")[0]),
          ini: hmParaMin(h.inicio),
          fim: hmParaMin(h.inicio) + h.minutos,
        })),
    ];
    for (const s of SESSOES_SEGURANCA) {
      const ini = hmParaMin(s.hora);
      const fim = ini + s.minutos;
      const cruza = ocupados.filter((o) => o.dia === s.dia && ini < o.fim && o.ini < fim);
      expect(cruza, `sessão de ${s.dia} às ${s.hora}`).toEqual([]);
    }
  });

  it("a tarde de terça e quinta é da Segurança nas semanas compartilhadas e da DevOps nas pausas", () => {
    expect(turnoCedidoASeguranca("2026-10-20", "tarde")).toBe(true); // terça da semana zero
    expect(turnoCedidoASeguranca("2026-10-20", "manha")).toBe(false);
    expect(turnoCedidoASeguranca("2026-10-21", "tarde")).toBe(false); // quarta
    expect(turnoCedidoASeguranca("2026-10-27", "tarde")).toBe(false); // Revisão CKA
    expect(turnoCedidoASeguranca("2026-11-10", "tarde")).toBe(true);
    expect(turnoCedidoASeguranca("2027-02-16", "tarde")).toBe(false); // Pausa CKA
    expect(turnoCedidoASeguranca("2027-10-26", "tarde")).toBe(false); // depois da trilha

    const devops = sessoesDaDevops("2026-10-26", "2026-11-15").filter((s) => s.turno === "tarde");
    const dias = devops.map((s) => s.data);
    expect(dias).toContain("2026-10-27"); // terça na pausa: DevOps
    expect(dias).toContain("2026-11-05"); // quinta na pausa: DevOps (simulado diagnóstico)
    expect(dias).not.toContain("2026-11-10"); // terça compartilhada: Segurança
    expect(dias).toContain("2026-11-09"); // segunda continua DevOps
  });

  it("cancela terça e quinta nas pausas", () => {
    const tercas = datasEmPausa(2, "2026-10-20").map((d) => d.data);
    expect(tercas.slice(0, 2)).toEqual(["2026-10-27", "2026-11-03"]);
    expect(datasEmPausa(4, "2026-10-20")[0]).toEqual({
      data: "2026-10-29",
      motivo: "Pausa: Revisão CKA",
    });
    // A partir de uma data, só as pausas que ainda vêm.
    expect(datasEmPausa(2, "2027-05-01").map((d) => d.data)[0]).toBe("2027-05-18");
  });
});
