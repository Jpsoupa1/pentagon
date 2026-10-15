import { describe, expect, it } from "vitest";
import { HORARIOS_PADRAO, TIPO_SESSAO } from "@/lib/estudos";
import { paraUtc } from "@/lib/tempo";
import { minutosPorArea } from "../agenda/recorrencia";
import { ocorrenciasDeMarcos, ocorrenciasDeSessoes } from "./ocorrencias";
import { ROTINA, semanaDaTrilha, TODOS_OS_DIAS } from "./trilha";

describe("semana da trilha", () => {
  it("semana zero começa em 12/10/2026 e a semana 1 em 19/10/2026", () => {
    expect(semanaDaTrilha("2026-10-12")).toBe(0);
    expect(semanaDaTrilha("2026-10-18")).toBe(0);
    expect(semanaDaTrilha("2026-10-19")).toBe(1);
  });

  it("termina em 26/09/2027 na semana 49", () => {
    expect(ROTINA.FIM).toBe("2027-09-26");
    expect(semanaDaTrilha("2027-09-26")).toBe(49);
    expect(semanaDaTrilha("2027-09-27")).toBeNull();
    expect(semanaDaTrilha("2026-10-11")).toBeNull();
  });

  it("tem quatro fases com as provas certas", () => {
    expect(ROTINA.FASES.slice(1).map((f) => f.prova)).toEqual([
      "CKA",
      "AWS SAA",
      "Terraform Associate",
      "Projeto principal",
    ]);
  });

  it("tipos de sessão por dia", () => {
    expect(TIPO_SESSAO).toEqual({
      0: "Revisão",
      1: "Aula",
      2: "Lab",
      3: "Aprofundar",
      4: "Base",
      5: "Reposição",
      6: "Projeto",
    });
    expect(ROTINA.sessao("2026-10-19", TODOS_OS_DIAS)?.tipo).toBe("Aula");
    expect(ROTINA.sessao("2026-10-23", TODOS_OS_DIAS)?.tipo).toBe("Reposição");
  });

  it("horários padrão iguais aos da trilha original (tarde, sexta desligada)", () => {
    for (const [d, slot] of Object.entries(ROTINA.PADRAO.dias)) {
      expect(HORARIOS_PADRAO[d]).toEqual({ ativo: slot.on, inicio: slot.ini, minutos: slot.min });
    }
  });

  it("marcos nas datas combinadas", () => {
    expect(ROTINA.MARCOS.map((m) => m.data)).toEqual([
      "2026-11-27",
      "2027-02-26",
      "2027-03-01",
      "2027-03-19",
      "2027-05-28",
      "2027-07-23",
      "2027-09-24",
    ]);
  });
});

describe("sessões na agenda", () => {
  const semana = ROTINA.sessoesEntre("2026-10-19", "2026-10-25", TODOS_OS_DIAS).map((s, i) => ({
    id: `s${i}`,
    data: s.data,
    tipo: s.tipo,
    conteudo: s.texto,
    status: "pendente" as const,
    diaSemana: s.dow,
  }));

  it("ficam à tarde nos dias ligados e somem na sexta desligada", () => {
    const oc = ocorrenciasDeSessoes(semana, HORARIOS_PADRAO, "America/Sao_Paulo");
    expect(oc.map((o) => o.dataOriginal)).toEqual([
      "2026-10-19",
      "2026-10-20",
      "2026-10-21",
      "2026-10-22",
      "2026-10-24",
      "2026-10-25",
    ]);
    expect(oc[0].inicio).toEqual(paraUtc("2026-10-19", "14:00"));
    expect(oc[0].fim).toEqual(paraUtc("2026-10-19", "15:30"));
    expect(oc[4].inicio).toEqual(paraUtc("2026-10-24", "09:00"));
    expect(oc[5].inicio).toEqual(paraUtc("2026-10-25", "19:00"));
    expect(oc[0].titulo).toBe(`Aula: ${semana[0].conteudo}`);
    expect(minutosPorArea(oc).estudos).toBe(4 * 90 + 180 + 60);
  });

  it("mudar o horário não muda a sessão, só a hora", () => {
    const h = { ...HORARIOS_PADRAO, "1": { ativo: true, inicio: "13:00", minutos: 60 } };
    const [seg] = ocorrenciasDeSessoes(semana, h, "America/Sao_Paulo");
    expect(seg.eventId).toBe("s0");
    expect(seg.inicio).toEqual(paraUtc("2026-10-19", "13:00"));
  });

  it("marcos viram itens de dia inteiro", () => {
    const [bf] = ocorrenciasDeMarcos(
      ROTINA.MARCOS,
      { de: "2026-11-23", ate: "2026-11-29" },
      "America/Sao_Paulo",
    );
    expect(bf.diaInteiro).toBe(true);
    expect(bf.titulo).toBe("Marco: Black Friday: comprar o voucher da CKA");
  });
});
