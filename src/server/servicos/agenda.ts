import "server-only";
import { and, asc, eq, gte, lt } from "drizzle-orm";
import { addDias, hojeLocal, paraUtc, segundaDe } from "@/lib/tempo";
import { agoraEProximo } from "../agenda/agora";
import {
  expandirOcorrencias,
  minutosPorArea,
  type Intervalo,
  type Ocorrencia,
} from "../agenda/recorrencia";
import { db } from "../db";
import { assessments, subjects } from "../db/schema";
import { obterAjustes } from "./ajustes";
import { proximosPrazos } from "./avaliacoes";
import { eventosNoIntervalo } from "./eventos";
import { lembretesDeHoje } from "./lembretes";

export async function ocorrencias(userId: string, intervalo: Intervalo): Promise<Ocorrencia[]> {
  const { eventos, excecoes } = await eventosNoIntervalo(userId, intervalo.de, intervalo.ate);
  return expandirOcorrencias(eventos, excecoes, intervalo);
}

async function prazosNoIntervalo(userId: string, intervalo: Intervalo, fuso: string) {
  return db()
    .select({
      id: assessments.id,
      tipo: assessments.tipo,
      titulo: assessments.titulo,
      sigla: subjects.sigla,
      entregaEm: assessments.entregaEm,
      concluidaEm: assessments.concluidaEm,
    })
    .from(assessments)
    .leftJoin(subjects, eq(subjects.id, assessments.subjectId))
    .where(
      and(
        eq(assessments.userId, userId),
        gte(assessments.entregaEm, paraUtc(intervalo.de, "00:00", fuso)),
        lt(assessments.entregaEm, paraUtc(addDias(intervalo.ate, 1), "00:00", fuso)),
      ),
    )
    .orderBy(asc(assessments.entregaEm));
}

/** Tudo que a Agenda precisa para um intervalo: ocorrências, prazos e horas por área. */
export async function agenda(userId: string, intervalo: Intervalo) {
  const { fuso } = await obterAjustes(userId);
  const [lista, prazos] = await Promise.all([
    ocorrencias(userId, intervalo),
    prazosNoIntervalo(userId, intervalo, fuso),
  ]);
  return { intervalo, fuso, ocorrencias: lista, prazos, minutosPorArea: minutosPorArea(lista) };
}

export function semanaDe(data: string): Intervalo {
  const de = segundaDe(data);
  return { de, ate: addDias(de, 6) };
}

/** Dados da tela Hoje. */
export async function painelHoje(userId: string, agora = new Date()) {
  const { fuso } = await obterAjustes(userId);
  const hoje = hojeLocal(agora, fuso);
  const semana = semanaDe(hoje);
  const [daSemana, prazos, lembretes] = await Promise.all([
    ocorrencias(userId, semana),
    proximosPrazos(userId, paraUtc(hoje, "00:00", fuso)),
    lembretesDeHoje(userId, hoje, fuso),
  ]);
  const doDia = daSemana.filter(
    (o) =>
      o.inicio < paraUtc(addDias(hoje, 1), "00:00", fuso) && o.fim > paraUtc(hoje, "00:00", fuso),
  );
  // "Próximo" pode estar num dia seguinte da semana se hoje já acabou.
  const { atual, proximo } = agoraEProximo(daSemana, agora);
  return {
    hoje,
    fuso,
    agora: agora.toISOString(),
    atual,
    proximo,
    doDia,
    minutosPorArea: minutosPorArea(daSemana),
    prazos,
    lembretes,
  };
}
