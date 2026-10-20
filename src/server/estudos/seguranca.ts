import { and, eq, inArray } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { addDias, diaDaSemana, FUSO_PADRAO, hojeLocal, paraUtc } from "../../lib/tempo";
import { events, settings, studyTracks, type FaseTrilha } from "../db/schema";
import { PERIODO_DA_SEGURANCA } from "../roadmap/compartilhamento";
import diaria from "../roadmap/trilhas/seguranca-diaria.json";
import seguranca from "../roadmap/trilhas/seguranca.json";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QualquerDb = NodePgDatabase<any>;

// Trilha Segurança (SecOps e Cibersegurança): fases com datas, definidas no Roadmap
// (src/server/roadmap/trilhas/seguranca.json), e uma tarefa por dia útil
// (seguranca-diaria.json, gerada de docs/seguranca/roadmap-profissional.md). Aqui ficam só a
// trilha de estudos e o bloco diário na agenda.

export const SLUG_SEGURANCA = "seguranca";
export const NOME_SEGURANCA = "Segurança e SecOps";

export const FASES_SEGURANCA: FaseTrilha[] = seguranca.phases.map((f, i) => ({
  id: i + 1,
  nome: f.name,
  curto: f.short_name,
  prova: f.gate_name,
}));

/** O bloco da trilha na agenda: de segunda a sexta, das 17:30 às 18:40, entre a academia e a aula. */
export const BLOCO_SEGURANCA = {
  titulo: "Ciber e SecOps",
  dias: [1, 2, 3, 4, 5],
  hora: "17:30",
  minutos: 70,
} as const;

const NOTAS =
  "Bloco da trilha Segurança. A tarefa de cada dia aparece aqui na agenda; fases e requisitos " +
  "estão no Roadmap (Trilhas › Segurança). Pratique só em laboratório próprio ou nas " +
  "plataformas feitas para isso.";

export type TarefaSeguranca = (typeof diaria)[number];

const TAREFAS = new Map<string, TarefaSeguranca>(diaria.map((t) => [t.data, t]));

/** A tarefa da trilha diária num dia (null fora dela, nos fins de semana e depois da prova). */
export function tarefaDaSeguranca(data: string): TarefaSeguranca | null {
  return TAREFAS.get(data) ?? null;
}

/** Primeiro dia do bloco a partir de uma data (a própria data, se for dia útil). */
function primeiroDiaDoBloco(desde: string) {
  let d = desde;
  while (!(BLOCO_SEGURANCA.dias as readonly number[]).includes(diaDaSemana(d))) d = addDias(d, 1);
  return d;
}

/**
 * Registra a trilha Segurança e o bloco diário como compromisso recorrente (sem data de fim).
 * Idempotente: se a trilha já tem o bloco, atualiza nome, fases e datas e não mexe no compromisso
 * (o usuário pode ter mudado o horário ou apagado). Versões antigas são trocadas uma única vez:
 * a sem datas (fim nulo, terça e quinta às 17:45 e sexta às 14:00) e a de sessões semanais
 * (terça e quinta às 14:00 e sábado às 14:00), que tinham um compromisso por dia da semana.
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

  const sessoes = existente
    ? await db
        .select({ id: events.id, diasSemana: events.diasSemana })
        .from(events)
        .where(and(eq(events.userId, userId), eq(events.trackId, existente.id)))
    : [];
  const antigas = sessoes.filter((s) => (s.diasSemana?.length ?? 0) <= 1);
  const versaoAntiga = !!existente && (existente.fim === null || antigas.length > 0);

  if (existente && !versaoAntiga) {
    await db.update(studyTracks).set(dados).where(eq(studyTracks.id, existente.id));
    return { criada: false, migrada: false };
  }

  const [ajuste] = await db
    .select({ fuso: settings.fuso })
    .from(settings)
    .where(eq(settings.userId, userId));
  const fuso = ajuste?.fuso ?? FUSO_PADRAO;
  const hoje = hojeLocal(agora, fuso);
  const data = primeiroDiaDoBloco(
    hoje > PERIODO_DA_SEGURANCA.inicio ? hoje : PERIODO_DA_SEGURANCA.inicio,
  );

  await db.transaction(async (tx) => {
    let trackId: string;
    if (existente) {
      // Versão antiga: os compromissos semanais dela (e os cancelamentos, em cascata) saem.
      trackId = existente.id;
      await tx.update(studyTracks).set(dados).where(eq(studyTracks.id, trackId));
      const sair = existente.fim === null ? sessoes : antigas;
      if (sair.length)
        await tx.delete(events).where(
          inArray(
            events.id,
            sair.map((a) => a.id),
          ),
        );
    } else {
      const [trilha] = await tx
        .insert(studyTracks)
        .values({ userId, slug: SLUG_SEGURANCA, marcos: [], ...dados })
        .returning({ id: studyTracks.id });
      trackId = trilha.id;
    }
    await tx.insert(events).values({
      userId,
      trackId,
      titulo: BLOCO_SEGURANCA.titulo,
      areaId: "estudos" as const,
      notas: NOTAS,
      inicio: paraUtc(data, BLOCO_SEGURANCA.hora, fuso),
      duracaoMin: BLOCO_SEGURANCA.minutos,
      fuso,
      diasSemana: [...BLOCO_SEGURANCA.dias],
      repeteDesde: data,
      repeteAte: null,
      lembrarMin: 10,
    });
  });
  return { criada: !existente, migrada: !!existente };
}
