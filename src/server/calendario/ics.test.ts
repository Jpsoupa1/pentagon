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

  it("muda o horário quando os Ajustes mudam, mantendo o UID", () => {
    const h = { ...HORARIOS_PADRAO, "1": { ativo: true, inicio: "15:30", minutos: 60 } };
    const seg = eventosDe(feed(h)).find((e) => e.includes("UID:sessao-2026-10-19@rotina-devops"))!;
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
