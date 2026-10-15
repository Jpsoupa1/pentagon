import "server-only";
import type { z } from "zod";
import {
  addDias,
  DIAS_CURTOS,
  dataCurta,
  hojeLocal,
  horaLocal,
  paraUtc,
  partesLocais,
} from "@/lib/tempo";
import type { eventoSchema, excecaoSchema } from "@/lib/validacao";
import type { Ocorrencia } from "../agenda/recorrencia";
import { encontrarConflitos, expandirComRegras, type Conflito } from "../agenda/regras";
import { Conflito as ErroConflito } from "../erros";
import { obterAjustes } from "./ajustes";
import { ocorrencias } from "./agenda";
import { feriadosEntre } from "./feriados";
import { atualizarEvento, criarEvento, linhaDoEvento, obterEvento, salvarExcecao } from "./eventos";

/** Quantos dias à frente a checagem de conflito olha para compromissos que repetem. */
const HORIZONTE_DIAS = 56;

export type DetalheConflito = { quando: string; titulo: string; com: string; comHorario: string };

function descrever(c: Conflito[], fuso: string): DetalheConflito[] {
  return c.map(({ ocorrencia: o, com }) => {
    const p = partesLocais(o.inicio, fuso);
    return {
      quando: `${DIAS_CURTOS[p.diaSemana]}, ${dataCurta(p.data)} · ${horaLocal(o.inicio, fuso)}–${horaLocal(o.fim, fuso)}`,
      titulo: o.titulo,
      com: com.titulo,
      comHorario: `${horaLocal(com.inicio, fuso)}–${horaLocal(com.fim, fuso)}`,
    };
  });
}

async function checar(
  userId: string,
  novas: Ocorrencia[],
  excluirEvento: string | undefined,
  ignorar: boolean,
) {
  if (ignorar || !novas.length) return;
  const { fuso } = await obterAjustes(userId);
  const datas = novas.map((o) => partesLocais(o.inicio, fuso).data).sort();
  const outras = await ocorrencias(userId, { de: datas[0], ate: datas.at(-1)! }, excluirEvento);
  const conflitos = encontrarConflitos(novas, outras);
  if (conflitos.length) {
    const detalhes = descrever(conflitos, fuso);
    throw new ErroConflito(
      conflitos.length === 1
        ? "Esse horário choca com outro compromisso."
        : `Esse horário choca com outros compromissos (${conflitos.length} vezes).`,
      { conflitos: detalhes.slice(0, 6), total: detalhes.length },
    );
  }
}

/** Ocorrências que o compromisso teria (do dia de hoje ou do início dele, por até 8 semanas). */
async function ocorrenciasPrevistas(userId: string, id: string, e: z.output<typeof eventoSchema>) {
  const linha = await linhaDoEvento(userId, e);
  const { fuso, periodoInicio, periodoFim } = await obterAjustes(userId);
  const de = [hojeLocal(new Date(), fuso), e.data].sort().at(-1)!;
  const intervalo = e.diasSemana
    ? { de, ate: addDias(de, HORIZONTE_DIAS) }
    : { de: e.data, ate: e.data };
  const feriados = await feriadosEntre(userId, intervalo.de, intervalo.ate);
  return expandirComRegras(
    [{ ...linha, id }],
    [],
    feriados,
    { inicio: periodoInicio, fim: periodoFim },
    intervalo,
  );
}

export async function criarComChecagem(userId: string, e: z.output<typeof eventoSchema>) {
  await checar(userId, await ocorrenciasPrevistas(userId, "novo", e), undefined, e.ignorarConflito);
  return criarEvento(userId, e);
}

export async function atualizarComChecagem(
  userId: string,
  id: string,
  e: z.output<typeof eventoSchema>,
) {
  await obterEvento(userId, id);
  await checar(userId, await ocorrenciasPrevistas(userId, id, e), id, e.ignorarConflito);
  return atualizarEvento(userId, id, e);
}

/** Mudança de um dia só: confere o novo horário contra o resto daquele dia. */
export async function excecaoComChecagem(
  userId: string,
  eventId: string,
  x: z.output<typeof excecaoSchema>,
) {
  const evento = await obterEvento(userId, eventId);
  if (x.tipo === "movida") {
    const inicio = paraUtc(x.novaData!, x.novaHora!, evento.fuso);
    const minutos = x.novaDuracaoMin ?? evento.duracaoMin;
    const nova: Ocorrencia = {
      chave: `${eventId}:${x.data}`,
      origem: "evento",
      eventId,
      dataOriginal: x.data,
      titulo: evento.titulo,
      areaId: evento.areaId,
      subjectId: evento.subjectId,
      local: evento.local,
      inicio,
      fim: new Date(inicio.getTime() + minutos * 60_000),
      diaInteiro: false,
      movida: true,
      recorrente: !!evento.diasSemana,
    };
    await checar(userId, [nova], eventId, x.ignorarConflito);
  }
  return salvarExcecao(userId, eventId, x);
}
