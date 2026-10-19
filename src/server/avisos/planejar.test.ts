import { describe, expect, it } from "vitest";
import { HORARIOS_PADRAO } from "@/lib/estudos";
import { horaLocal, paraUtc } from "@/lib/tempo";
import { ocorrenciasDeSessoes } from "../estudos/ocorrencias";
import {
  avisosDeAvaliacoes,
  avisosDeCompromissos,
  avisosDeLembretes,
  avisosDeSessoes,
  diferencaAvisos,
  type AvisoExistente,
} from "./planejar";

const fuso = "America/Sao_Paulo";
const sessoes = (feitaSeg = false) =>
  ocorrenciasDeSessoes(
    [
      {
        id: "seg",
        data: "2026-10-19",
        turno: "tarde",
        tipo: "Aula",
        conteudo: "ALM",
        status: feitaSeg ? "feita" : "pendente",
        diaSemana: 1,
      },
      {
        id: "ter",
        data: "2026-10-20",
        turno: "tarde",
        tipo: "Lab",
        conteudo: "Rollback",
        status: "pendente",
        diaSemana: 2,
      },
      {
        id: "qua",
        data: "2026-10-21",
        turno: "tarde",
        tipo: "Aprofundar",
        conteudo: "Simulado",
        status: "pendente",
        diaSemana: 3,
      },
    ],
    HORARIOS_PADRAO,
    fuso,
  );
const hl = (d: Date) => horaLocal(d, fuso);

describe("agendamento de avisos", () => {
  it("agenda N minutos antes das sessões das próximas 48 h", () => {
    const agora = paraUtc("2026-10-19", "08:00");
    const avisos = avisosDeSessoes(sessoes(), 10, agora, hl);
    expect(avisos.map((a) => [a.alvoId, a.enviarEm.toISOString()])).toEqual([
      ["seg", paraUtc("2026-10-19", "13:50").toISOString()],
      ["ter", paraUtc("2026-10-20", "13:50").toISOString()],
    ]);
    expect(avisos[0].titulo).toBe("Estudo em 10 min · 14:00");
    expect(avisos[0].corpo).toBe("Aula: ALM");
  });

  it("não agenda sessão feita nem aviso cujo horário já passou", () => {
    expect(
      avisosDeSessoes(sessoes(true), 10, paraUtc("2026-10-19", "08:00"), hl).map((a) => a.alvoId),
    ).toEqual(["ter"]);
    expect(
      avisosDeSessoes(sessoes(), 10, paraUtc("2026-10-19", "13:55"), hl).map((a) => a.alvoId),
    ).toEqual(["ter", "qua"]);
  });

  it("ao mudar o horário cancela o aviso antigo e cria o novo", () => {
    const agora = paraUtc("2026-10-19", "08:00");
    const antes = avisosDeSessoes(sessoes(), 10, agora, hl);
    const existentes: AvisoExistente[] = antes.map((a, i) => ({
      ...a,
      id: `n${i}`,
      qstashMessageId: `m${i}`,
    }));
    const h = { ...HORARIOS_PADRAO, "1-tarde": { ativo: true, inicio: "15:00", minutos: 90 } };
    const depois = avisosDeSessoes(
      ocorrenciasDeSessoes(
        [
          {
            id: "seg",
            data: "2026-10-19",
            turno: "tarde",
            tipo: "Aula",
            conteudo: "ALM",
            status: "pendente",
            diaSemana: 1,
          },
        ],
        h,
        fuso,
      ),
      10,
      agora,
      hl,
    ).concat(antes.filter((a) => a.alvoId === "ter"));
    const { criar, cancelar } = diferencaAvisos(existentes, depois);
    expect(cancelar.map((c) => c.qstashMessageId)).toEqual(["m0"]);
    expect(criar.map((c) => c.enviarEm.toISOString())).toEqual([
      paraUtc("2026-10-19", "14:50").toISOString(),
    ]);
  });

  it("sessão marcada como feita cancela o aviso", () => {
    const agora = paraUtc("2026-10-19", "08:00");
    const existentes: AvisoExistente[] = avisosDeSessoes(sessoes(), 10, agora, hl).map((a, i) => ({
      ...a,
      id: `n${i}`,
      qstashMessageId: `m${i}`,
    }));
    const { criar, cancelar } = diferencaAvisos(
      existentes,
      avisosDeSessoes(sessoes(true), 10, agora, hl),
    );
    expect(criar).toEqual([]);
    expect(cancelar.map((c) => c.alvoId)).toEqual(["seg"]);
  });

  it("nada muda quando já está tudo agendado", () => {
    const agora = paraUtc("2026-10-19", "08:00");
    const desejados = avisosDeSessoes(sessoes(), 10, agora, hl);
    const existentes = desejados.map((a, i) => ({ ...a, id: `n${i}`, qstashMessageId: `m${i}` }));
    expect(diferencaAvisos(existentes, desejados)).toEqual({ criar: [], cancelar: [] });
  });
});

describe("avisos de todas as áreas", () => {
  const agora = paraUtc("2026-10-19", "08:00");

  it("compromisso com 'lembrar antes' avisa por ocorrência; sem ele, não avisa", async () => {
    const { expandirOcorrencias } = await import("../agenda/recorrencia");
    const aula = {
      id: "dweb",
      titulo: "Desenvolvimento Web",
      areaId: "aulas" as const,
      inicio: paraUtc("2026-10-22", "19:10"),
      duracaoMin: 170,
      diaInteiro: false,
      fuso,
      diasSemana: [4],
      repeteDesde: "2026-10-22",
      repeteAte: null,
      local: "Sala 12",
    };
    const oc = expandirOcorrencias([aula], [], { de: "2026-10-19", ate: "2026-10-25" });
    expect(
      avisosDeCompromissos(oc, new Map([["dweb", 15]]), paraUtc("2026-10-21", "08:00"), hl),
    ).toEqual([
      expect.objectContaining({
        alvoTipo: "evento",
        enviarEm: paraUtc("2026-10-22", "18:55"),
        titulo: "Desenvolvimento Web em 15 min · 19:10",
        corpo: "Local: Sala 12",
      }),
    ]);
    expect(
      avisosDeCompromissos(oc, new Map([["dweb", null]]), paraUtc("2026-10-21", "08:00"), hl),
    ).toEqual([]);
  });

  it("prova avisa na véspera e horas antes", () => {
    const prova = {
      id: "p1",
      titulo: "Prova 1",
      tipo: "Prova",
      sigla: "CALC",
      entregaEm: paraUtc("2026-10-20", "19:10"),
      lembrarMin: 120,
    };
    const a = avisosDeAvaliacoes([prova], agora, hl);
    expect(a.map((x) => [x.enviarEm.toISOString(), x.titulo])).toEqual([
      [paraUtc("2026-10-19", "19:10").toISOString(), "Amanhã: Prova de CALC às 19:10"],
      [paraUtc("2026-10-20", "17:10").toISOString(), "Prova de CALC em 2 h · 19:10"],
    ]);
  });

  it("lembrete avisa na hora marcada, só dentro da janela", () => {
    const l = [
      { id: "l1", texto: "Pagar a fatura", quando: paraUtc("2026-10-19", "18:00") },
      { id: "l2", texto: "Muito longe", quando: paraUtc("2026-11-30", "18:00") },
    ];
    expect(avisosDeLembretes(l, agora).map((x) => x.alvoId)).toEqual(["l1"]);
  });
});
