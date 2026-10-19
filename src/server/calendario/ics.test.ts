import { describe, expect, it } from "vitest";
import { HORARIOS_PADRAO } from "@/lib/estudos";
import { ROTINA, TODOS_OS_DIAS } from "../estudos/trilha";
import { dobrar, gerarCalendario } from "./ics";
import { eventosDaTrilha } from "./trilha";

const agora = new Date("2026-10-15T12:00:00Z");
const url = "https://pentagon-mauve.vercel.app";

function eventosDe(ics: string) {
  return (
    ics
      .split("\r\n")
      .join("\n")
      .match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) ?? []
  );
}

const sessoes = ROTINA.sessoesEntre(ROTINA.INICIO, ROTINA.FIM, TODOS_OS_DIAS).map((s) => ({
  data: s.data,
  turno: s.turno,
  tipo: s.tipo,
  conteudo: s.texto,
  semana: s.semana,
  fase: s.fase,
  tema: s.tema,
  parte: s.parte,
}));

function feed(horarios = HORARIOS_PADRAO, avisoMin = 10) {
  return gerarCalendario({
    nome: "Pentagon",
    fuso: "America/Sao_Paulo",
    agora,
    eventos: eventosDaTrilha({
      sessoes,
      fases: ROTINA.FASES,
      marcos: ROTINA.MARCOS,
      horarios,
      avisoMin,
      urlApp: url,
    }),
  });
}

describe("feed .ics", () => {
  it("gera exatamente os mesmos eventos do gerador original da trilha", () => {
    const original = eventosDe(ROTINA.gerarICS(ROTINA.PADRAO, undefined, { agora, url }));
    const nosso = eventosDe(feed());
    expect(original.length).toBe(
      ROTINA.sessoesEntre(ROTINA.INICIO, ROTINA.FIM).length + ROTINA.MARCOS.length,
    );
    expect(nosso).toEqual(original);
  });

  it("tem alerta em cada evento e respeita a antecedência dos Ajustes", () => {
    const ics = feed(HORARIOS_PADRAO, 30);
    const eventos = eventosDe(ics);
    expect(eventos.every((e) => e.includes("BEGIN:VALARM"))).toBe(true);
    expect(eventos[0]).toContain("TRIGGER:-PT30M");
  });

  it("traz as duas sessões de cada dia útil, com o alerta configurado", () => {
    const seg = eventosDe(feed(HORARIOS_PADRAO, 15)).filter((e) =>
      e.includes("DTSTART;TZID=America/Sao_Paulo:20261109"),
    );
    expect(seg).toHaveLength(2);
    expect(seg[0]).toContain("UID:sessao-2026-11-09-manha@rotina-devops");
    expect(seg[0]).toContain("DTSTART;TZID=America/Sao_Paulo:20261109T080000");
    expect(seg[0]).toContain("SUMMARY:Aula: Drain\\, cordon e atualização do sistema dos nós");
    expect(seg[1]).toContain("UID:sessao-2026-11-09-tarde@rotina-devops");
    expect(seg[1]).toContain("DTSTART;TZID=America/Sao_Paulo:20261109T140000");
    expect(seg[1]).toContain("SUMMARY:Prática do tema da manhã");
    for (const e of seg) expect(e).toContain("TRIGGER:-PT15M");
  });

  it("muda o horário quando os Ajustes mudam, mantendo o UID", () => {
    const h = { ...HORARIOS_PADRAO, "1-tarde": { ativo: true, inicio: "15:30", minutos: 60 } };
    const seg = eventosDe(feed(h)).find((e) =>
      e.includes("UID:sessao-2026-10-19-tarde@rotina-devops"),
    )!;
    expect(seg).toContain("DTSTART;TZID=America/Sao_Paulo:20261019T153000");
    expect(seg).toContain("DTEND;TZID=America/Sao_Paulo:20261019T163000");
  });

  it("usa CRLF e dobra linhas longas em até 75 octetos", () => {
    const ics = feed();
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    for (const linha of ics.split("\r\n"))
      expect(new TextEncoder().encode(linha).length).toBeLessThanOrEqual(75);
    expect(dobrar("á".repeat(60)).split("\r\n")[0]).toHaveLength(37);
  });
});
