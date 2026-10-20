import { describe, expect, it } from "vitest";
import { HORARIOS_PADRAO, TURNOS_ESTUDO } from "@/lib/estudos";
import { diaDaSemana, paraUtc } from "@/lib/tempo";
import { minutosPorArea } from "../agenda/recorrencia";
import { ocorrenciasDeMarcos, ocorrenciasDeSessoes } from "./ocorrencias";
import { ROTINA, semanaDaTrilha, TODOS_OS_DIAS } from "./trilha";

describe("semana da trilha", () => {
  it("semana zero começa em 19/10/2026 e a semana 1 em 26/10/2026", () => {
    expect(semanaDaTrilha("2026-10-18")).toBeNull();
    expect(semanaDaTrilha("2026-10-19")).toBe(0);
    expect(semanaDaTrilha("2026-10-25")).toBe(0);
    expect(semanaDaTrilha("2026-10-26")).toBe(1);
  });

  it("termina em 03/10/2027 na semana 49", () => {
    expect(ROTINA.FIM).toBe("2027-10-03");
    expect(semanaDaTrilha("2027-10-03")).toBe(49);
    expect(semanaDaTrilha("2027-10-04")).toBeNull();
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

  it("a semana zero continua com uma sessão por dia, à tarde, e ganha a reposição de sexta", () => {
    const zero = ROTINA.sessoesEntre("2026-10-19", "2026-10-25", TODOS_OS_DIAS);
    expect(zero.map((s) => [s.data, s.turno, s.ini, s.titulo])).toEqual([
      ["2026-10-19", "tarde", "14:00", "Aula: Ler o plano de estudos completo"],
      ["2026-10-20", "tarde", "14:00", "Lab: Separar os horários fixos da semana"],
      ["2026-10-21", "tarde", "14:00", "Aprofundar: Revisar o que já foi feito na CKA"],
      [
        "2026-10-22",
        "tarde",
        "14:00",
        "Base: Configurar o app, o calendário e o widget da tela bloqueada",
      ],
      ["2026-10-23", "tarde", "14:00", "Reposição do que atrasou"],
      [
        "2026-10-24",
        "manha",
        "09:00",
        "Projeto: Montar o lab no CachyOS (minikube e kind) e criar o repositório do Projeto 1",
      ],
      ["2026-10-25", "noite", "19:00", "Revisão: Planejar a semana 1"],
    ]);
  });

  it("horários padrão iguais aos da trilha (dois blocos de segunda a quinta)", () => {
    expect(Object.keys(HORARIOS_PADRAO).sort()).toEqual(TURNOS_ESTUDO.map((t) => t.chave).sort());
    for (const [chave, slot] of Object.entries(ROTINA.PADRAO.turnos)) {
      expect(HORARIOS_PADRAO[chave]).toEqual({
        ativo: slot.on,
        inicio: slot.ini,
        minutos: slot.min,
      });
    }
  });

  it("marcos nas datas combinadas", () => {
    expect(ROTINA.MARCOS.map((m) => m.data)).toEqual([
      "2026-11-27",
      "2027-03-01",
      "2027-03-05",
      "2027-03-26",
      "2027-06-04",
      "2027-07-30",
      "2027-10-01",
    ]);
  });
});

describe("sessões na agenda", () => {
  const paraAgenda = (de: string, ate: string) =>
    ROTINA.sessoesEntre(de, ate, TODOS_OS_DIAS).map((s) => ({
      id: s.id,
      data: s.data,
      turno: s.turno,
      tipo: s.tipo,
      conteudo: s.texto,
      status: "pendente" as const,
      diaSemana: diaDaSemana(s.data),
      permiteSobreposicao: s.permiteSobreposicao,
    }));
  const semana3 = paraAgenda("2026-11-09", "2026-11-15");

  it("ficam no horário de cada turno e contam 19 h em Estudos", () => {
    const oc = ocorrenciasDeSessoes(semana3, HORARIOS_PADRAO, "America/Sao_Paulo");
    expect(oc).toHaveLength(12);
    expect(oc[0].inicio).toEqual(paraUtc("2026-11-09", "08:00"));
    expect(oc[0].fim).toEqual(paraUtc("2026-11-09", "09:30"));
    expect(oc[1].inicio).toEqual(paraUtc("2026-11-09", "14:00"));
    expect(oc[0].titulo).toBe("Aula: Drain, cordon e atualização do sistema dos nós");
    expect(oc[0].chave).toBe("sessao:2026-11-09:manha");
    expect(minutosPorArea(oc).estudos).toBe(19 * 60);
  });

  it("turno desligado some da agenda", () => {
    const h = {
      ...HORARIOS_PADRAO,
      "5-manha": { ativo: false, inicio: "08:00", minutos: 90 },
      "5-tarde": { ativo: false, inicio: "14:00", minutos: 90 },
    };
    const oc = ocorrenciasDeSessoes(semana3, h, "America/Sao_Paulo");
    expect(oc.map((o) => o.dataOriginal)).not.toContain("2026-11-13");
  });

  it("mudar o horário não muda a sessão, só a hora", () => {
    const h = { ...HORARIOS_PADRAO, "1-tarde": { ativo: true, inicio: "13:00", minutos: 60 } };
    const [, tarde] = ocorrenciasDeSessoes(semana3, h, "America/Sao_Paulo");
    expect(tarde.eventId).toBe("2026-11-09-tarde");
    expect(tarde.inicio).toEqual(paraUtc("2026-11-09", "13:00"));
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
