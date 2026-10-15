import { describe, expect, it } from "vitest";
import { HORARIOS_PADRAO } from "@/lib/estudos";
import { horaLocal, paraUtc } from "@/lib/tempo";
import { ocorrenciasDeSessoes } from "../estudos/ocorrencias";
import { avisosDeSessoes, diferencaAvisos, type AvisoExistente } from "./planejar";

const fuso = "America/Sao_Paulo";
const sessoes = (feitaSeg = false) =>
  ocorrenciasDeSessoes(
    [
      {
        id: "seg",
        data: "2026-10-19",
        tipo: "Aula",
        conteudo: "ALM",
        status: feitaSeg ? "feita" : "pendente",
        diaSemana: 1,
      },
      {
        id: "ter",
        data: "2026-10-20",
        tipo: "Lab",
        conteudo: "Rollback",
        status: "pendente",
        diaSemana: 2,
      },
      {
        id: "qua",
        data: "2026-10-21",
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
    const h = { ...HORARIOS_PADRAO, "1": { ativo: true, inicio: "15:00", minutos: 90 } };
    const depois = avisosDeSessoes(
      ocorrenciasDeSessoes(
        [
          {
            id: "seg",
            data: "2026-10-19",
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
