import "server-only";
import { and, asc, eq, gte, lt } from "drizzle-orm";
import { addDias, hojeLocal, paraUtc, segundaDe } from "@/lib/tempo";
import { agoraEProximo } from "../agenda/agora";
import { minutosPorArea, type Intervalo, type Ocorrencia } from "../agenda/recorrencia";
import { expandirComRegras, marcarNoEstagio, ocorrenciasDeFeriados } from "../agenda/regras";
import { db } from "../db";
import { assessments, subjects } from "../db/schema";
import { obterAjustes } from "./ajustes";
import { cardsDeHoje } from "./cards";
import { eventosNoIntervalo } from "./eventos";
import { feriadosEntre } from "./feriados";
import { tarefaDaSeguranca } from "../estudos/seguranca";
import { idDaTrilhaSeguranca, ocorrenciasDeEstudo, sessoesPendentes } from "./estudos";
import { lembretesDeHoje } from "./lembretes";
import { proximosPrazos } from "./prazos";

/**
 * Compromissos do usuário expandidos no intervalo, com período letivo, feriados e exceções aplicados.
 * `excluirEvento` deixa um compromisso de fora (para comparar a versão nova dele com o resto).
 */
export async function compromissos(userId: string, intervalo: Intervalo, excluirEvento?: string) {
  const [{ eventos, excecoes }, feriados, ajustes, seguranca] = await Promise.all([
    eventosNoIntervalo(userId, intervalo.de, intervalo.ate),
    feriadosEntre(userId, intervalo.de, intervalo.ate),
    obterAjustes(userId),
    idDaTrilhaSeguranca(userId),
  ]);
  const lista = excluirEvento ? eventos.filter((e) => e.id !== excluirEvento) : eventos;
  const periodo = { inicio: ajustes.periodoInicio, fim: ajustes.periodoFim };
  // O bloco da Segurança mostra a tarefa da trilha diária daquele dia.
  const blocosSeguranca = new Set(
    lista.filter((e) => seguranca && e.trackId === seguranca).map((e) => e.id),
  );
  return {
    eventos: lista,
    feriados,
    periodo,
    ocorrencias: expandirComRegras(lista, excecoes, feriados, periodo, intervalo).map((o) => {
      const tarefa = blocosSeguranca.has(o.eventId) ? tarefaDaSeguranca(o.dataOriginal) : null;
      return tarefa ? { ...o, detalhe: tarefa.tarefa } : o;
    }),
  };
}

const porHorario = (a: Ocorrencia, b: Ocorrencia) =>
  a.inicio.getTime() - b.inicio.getTime() || a.titulo.localeCompare(b.titulo);

/** Tudo o que ocupa a agenda no intervalo: compromissos, feriados, sessões e marcos da trilha. */
export async function ocorrencias(
  userId: string,
  intervalo: Intervalo,
  excluirEvento?: string,
): Promise<Ocorrencia[]> {
  const [c, estudo, { fuso }] = await Promise.all([
    compromissos(userId, intervalo, excluirEvento),
    ocorrenciasDeEstudo(userId, intervalo),
    obterAjustes(userId),
  ]);
  return marcarNoEstagio([
    ...c.ocorrencias,
    ...ocorrenciasDeFeriados(c.feriados, intervalo, fuso),
    ...estudo,
  ]).sort(porHorario);
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
  const { fuso, limiteCards } = await obterAjustes(userId);
  const hoje = hojeLocal(agora, fuso);
  const semana = semanaDe(hoje);
  const [daSemana, prazos, lembretes, pendentes, cards] = await Promise.all([
    ocorrencias(userId, semana),
    proximosPrazos(userId, paraUtc(hoje, "00:00", fuso)),
    lembretesDeHoje(userId, hoje, fuso),
    sessoesPendentes(userId, hoje),
    cardsDeHoje(userId, hoje, limiteCards),
  ]);
  const doDia = daSemana.filter(
    (o) =>
      o.inicio < paraUtc(addDias(hoje, 1), "00:00", fuso) && o.fim > paraUtc(hoje, "00:00", fuso),
  );
  // "Próximo" pode estar num dia seguinte da semana se hoje já acabou.
  // Sessões já feitas não disputam o cartão "Agora".
  const { atual, proximo } = agoraEProximo(
    daSemana.filter((o) => !o.feita),
    agora,
  );
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
    pendentes,
    cards,
  };
}
