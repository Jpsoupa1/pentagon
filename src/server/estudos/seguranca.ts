import { and, eq, inArray } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { addDias, diaDaSemana, FUSO_PADRAO, hojeLocal, paraUtc } from "../../lib/tempo";
import { eventExceptions, events, settings, studyTracks, type FaseTrilha } from "../db/schema";
import {
  DIAS_DA_SEGURANCA,
  PAUSAS_DA_SEGURANCA,
  PERIODO_DA_SEGURANCA,
} from "../roadmap/compartilhamento";
import seguranca from "../roadmap/trilhas/seguranca.json";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QualquerDb = NodePgDatabase<any>;

// Trilha Segurança (SecOps e Cibersegurança): fases com datas, definidas no Roadmap
// (src/server/roadmap/trilhas/seguranca.json). Corre em paralelo à DevOps e pausa nas retas
// finais das provas dela. Aqui ficam só a trilha de estudos e as sessões na agenda.

export const SLUG_SEGURANCA = "seguranca";
export const NOME_SEGURANCA = "Segurança e SecOps";

export const FASES_SEGURANCA: FaseTrilha[] = seguranca.phases.map((f, i) => ({
  id: i + 1,
  nome: f.name,
  curto: f.short_name,
  prova: f.gate_name,
}));

/**
 * Sessões semanais: as tardes de terça e quinta (que nas semanas compartilhadas deixam de ser da
 * DevOps) e o sábado à tarde. Cerca de 5 h por semana. Terça e quinta param nas pausas; o sábado não.
 */
export const SESSOES_SEGURANCA = [
  { dia: 2, hora: "14:00", minutos: 90 },
  { dia: 4, hora: "14:00", minutos: 90 },
  { dia: 6, hora: "14:00", minutos: 120 },
] as const;

const NOTAS =
  "Sessão da trilha Segurança. O que estudar e os requisitos da fase estão no Roadmap " +
  "(Trilhas › Segurança). Pratique só em laboratório próprio ou nas plataformas feitas para isso.";

/** Terças e quintas dentro das pausas, a partir de uma data: as sessões delas são canceladas. */
export function datasEmPausa(dia: number, desde: string) {
  const datas: { data: string; motivo: string }[] = [];
  for (const [i, p] of PAUSAS_DA_SEGURANCA.entries()) {
    for (let d = p.inicio; d <= p.fim; d = addDias(d, 1)) {
      if (d >= desde && diaDaSemana(d) === dia) {
        datas.push({ data: d, motivo: `Pausa: ${seguranca.breaks[i].label}` });
      }
    }
  }
  return datas;
}

/** Cancela as sessões de terça e quinta nas pausas (sem duplicar o que já está cancelado). */
async function cancelarNasPausas(
  db: Pick<QualquerDb, "insert">,
  userId: string,
  sessoes: { id: string; diasSemana: number[] | null; repeteDesde: string | null }[],
) {
  const linhas = sessoes.flatMap((s) => {
    const dia = s.diasSemana?.[0];
    if (dia === undefined || !(DIAS_DA_SEGURANCA as readonly number[]).includes(dia)) return [];
    return datasEmPausa(dia, s.repeteDesde ?? PERIODO_DA_SEGURANCA.inicio).map((d) => ({
      userId,
      eventId: s.id,
      data: d.data,
      tipo: "cancelada" as const,
      motivo: d.motivo,
    }));
  });
  if (linhas.length) await db.insert(eventExceptions).values(linhas).onConflictDoNothing();
}

/**
 * Registra a trilha Segurança e as sessões semanais como compromissos recorrentes.
 * Idempotente: se a trilha já existe, atualiza nome, fases e datas e mantém os compromissos (o
 * usuário pode ter mudado o horário ou apagado algum). A versão antiga (sem datas, fim nulo, com
 * sessões terça e quinta às 17:45 e sexta às 14:00) é trocada pela nova uma única vez.
 */
export async function semearSeguranca(db: QualquerDb, userId: string, agora = new Date()) {
  const [existente] = await db
    .select({ id: studyTracks.id, fim: studyTracks.fim })
    .from(studyTracks)
    .where(and(eq(studyTracks.userId, userId), eq(studyTracks.slug, SLUG_SEGURANCA)));
  const dados = {
    nome: NOME_SEGURANCA,
    inicio: PERIODO_DA_SEGURANCA.inicio,
    fim: PERIODO_DA_SEGURANCA.fim,
    fases: FASES_SEGURANCA,
    faseAtual: null,
  };

  if (existente && existente.fim !== null) {
    await db.update(studyTracks).set(dados).where(eq(studyTracks.id, existente.id));
    const sessoes = await db
      .select({ id: events.id, diasSemana: events.diasSemana, repeteDesde: events.repeteDesde })
      .from(events)
      .where(and(eq(events.userId, userId), eq(events.trackId, existente.id)));
    await cancelarNasPausas(db, userId, sessoes);
    return { criada: false, migrada: false };
  }

  const [ajuste] = await db
    .select({ fuso: settings.fuso })
    .from(settings)
    .where(eq(settings.userId, userId));
  const fuso = ajuste?.fuso ?? FUSO_PADRAO;
  const hoje = hojeLocal(agora, fuso);
  const desde = hoje > PERIODO_DA_SEGURANCA.inicio ? hoje : PERIODO_DA_SEGURANCA.inicio;

  await db.transaction(async (tx) => {
    let trackId: string;
    if (existente) {
      // Versão antiga: os compromissos dela (17:45 e sexta) saem e entram os novos.
      trackId = existente.id;
      await tx.update(studyTracks).set(dados).where(eq(studyTracks.id, trackId));
      const antigos = await tx
        .select({ id: events.id })
        .from(events)
        .where(and(eq(events.userId, userId), eq(events.trackId, trackId)));
      if (antigos.length)
        await tx.delete(events).where(
          inArray(
            events.id,
            antigos.map((a) => a.id),
          ),
        );
    } else {
      const [trilha] = await tx
        .insert(studyTracks)
        .values({ userId, slug: SLUG_SEGURANCA, marcos: [], ...dados })
        .returning({ id: studyTracks.id });
      trackId = trilha.id;
    }
    const criadas = await tx
      .insert(events)
      .values(
        SESSOES_SEGURANCA.map((s) => {
          // Primeira ocorrência: o próximo dia da semana da sessão, a partir de hoje.
          const data = addDias(desde, (s.dia - diaDaSemana(desde) + 7) % 7);
          return {
            userId,
            trackId,
            titulo: NOME_SEGURANCA,
            areaId: "estudos" as const,
            notas: NOTAS,
            inicio: paraUtc(data, s.hora, fuso),
            duracaoMin: s.minutos,
            fuso,
            diasSemana: [s.dia],
            repeteDesde: data,
            repeteAte: PERIODO_DA_SEGURANCA.fim,
            lembrarMin: 10,
          };
        }),
      )
      .returning({ id: events.id, diasSemana: events.diasSemana, repeteDesde: events.repeteDesde });
    await cancelarNasPausas(tx, userId, criadas);
  });
  return { criada: !existente, migrada: !!existente };
}
