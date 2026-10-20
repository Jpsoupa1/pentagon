import { describe, expect, it } from "vitest";
import { HORARIOS_PADRAO } from "@/lib/estudos";
import { hmParaMin } from "@/lib/tempo";
import { COMPROMISSOS } from "../rotina/seed";
import { FASES_SEGURANCA, SESSOES_SEGURANCA } from "./seguranca";

describe("trilha de Segurança e SecOps", () => {
  it("tem as quatro fases na ordem pedida, cada uma com prática", () => {
    expect(FASES_SEGURANCA.map((f) => [f.id, f.nome])).toEqual([
      [1, "Fundamentos"],
      [2, "Segurança de aplicações web"],
      [3, "SecOps"],
      [4, "DevSecOps"],
    ]);
    for (const f of FASES_SEGURANCA) {
      expect(f.temas?.length).toBeGreaterThan(0);
      expect(f.praticas?.length).toBeGreaterThan(0);
    }
  });

  it("é leve: 3 sessões por semana, só em dias úteis", () => {
    expect(SESSOES_SEGURANCA.map((s) => s.dia)).toEqual([2, 4, 5]);
  });

  it("não cruza com estágio, academia, aulas nem com a trilha DevOps", () => {
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
    for (const s of SESSOES_SEGURANCA) {
      const ini = hmParaMin(s.hora);
      const fim = ini + s.minutos;
      const cruza = ocupados.filter((o) => o.dia === s.dia && ini < o.fim && o.ini < fim);
      expect(cruza, `sessão de ${s.dia} às ${s.hora}`).toEqual([]);
    }
  });
});
