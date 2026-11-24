import { and, eq, inArray, isNull } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  INICIO_PADRAO_BLOCO,
  MINUTOS_PADRAO_BLOCO,
  type BlocosPlanoAjustes,
} from "../../lib/plano";
import { horaLocal } from "../../lib/tempo";
import {
  arquivamentos,
  events,
  flashcards,
  roadmapTrails,
  settings,
  studyTracks,
  users,
} from "../db/schema";
import { recebeConteudoPessoal } from "../permissao";
import { CHAVE_ERROS_ANTES_DO_PLANO } from "./arquivados";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QualquerDb = NodePgDatabase<any>;

/** `settings.blocos_plano` gravado na migração: os padrões de Ajustes (fim de semana desligado). */
export const BLOCOS_PLANO_PADRAO: BlocosPlanoAjustes = {
  dias_uteis: {
    manha: { inicio: INICIO_PADRAO_BLOCO.manha },
    teoria: { inicio: INICIO_PADRAO_BLOCO.teoria, minutos: MINUTOS_PADRAO_BLOCO.teoria },
    projeto: { inicio: INICIO_PADRAO_BLOCO.projeto, minutos: MINUTOS_PADRAO_BLOCO.projeto },
  },
  sabado: {},
  domingo: {},
};

/** A Academia do seed antigo: 16:00 com 90 min. Só quem ainda está assim passa para 80 min. */
const ACADEMIA = { titulo: "Academia", hora: "16:00", minutosAntigos: 90, minutosNovos: 80 };

/** Sem OWNER_EMAILS, `recebeConteudoPessoal` aceitaria todo mundo: aqui isso significa ninguém. */
export const temDonosDefinidos = () => !!process.env.OWNER_EMAILS?.trim();

export type ResultadoDaMigracao = "migrado" | "ja_migrado" | "nao_dono";

/**
 * Passo de dados do plano AI, uma vez por dono (marcado em `settings.plano_migrado_em`):
 * arquiva o que saiu do app, acerta a Academia e grava os padrões dos blocos. Nada é apagado.
 * Tudo numa transação: se algo falhar, o usuário fica como estava e o erro sobe.
 * A reconciliação dos avisos roda depois, fora daqui (scripts/migrar-plano.ts).
 */
export async function migrarPlano(
  db: QualquerDb,
  userId: string,
  agora = new Date(),
): Promise<ResultadoDaMigracao> {
  const [usuario] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId));
  if (!temDonosDefinidos() || !usuario || !recebeConteudoPessoal(usuario.email)) return "nao_dono";

  return db.transaction(async (tx) => {
    await tx.insert(settings).values({ userId }).onConflictDoNothing();
    // A trava na linha de ajustes impede dois deploys de migrarem o mesmo usuário ao mesmo tempo.
    const [ajuste] = await tx
      .select()
      .from(settings)
      .where(eq(settings.userId, userId))
      .for("update");
    if (ajuste.planoMigradoEm) return "ja_migrado";

    await arquivarTudo(tx, userId, agora);
    await ajustarAcademia(tx, userId);
    await tx
      .update(settings)
      .set({ planoMigradoEm: agora, blocosPlano: ajuste.blocosPlano ?? BLOCOS_PLANO_PADRAO })
      .where(eq(settings.userId, userId));
    return "migrado";
  });
}

/** Passo 1: registra em `arquivamentos` tudo o que existe hoje. Inserir é a única escrita. */
async function arquivarTudo(tx: QualquerDb, userId: string, agora: Date) {
  const trilhas = await tx
    .select({ id: studyTracks.id, slug: studyTracks.slug })
    .from(studyTracks)
    .where(eq(studyTracks.userId, userId));
  const doEvento = trilhas.length
    ? await tx
        .select({ id: events.id })
        .from(events)
        .where(
          and(
            eq(events.userId, userId),
            inArray(
              events.trackId,
              trilhas.map((t) => t.id),
            ),
          ),
        )
    : [];
  const roadmaps = await roadmapsDoCatalogo(tx);
  const cards = await tx
    .selectDistinct({ trilha: flashcards.trilha })
    .from(flashcards)
    .where(eq(flashcards.userId, userId));

  const registro = (tipo: (typeof arquivamentos.$inferInsert)["tipo"], chave: string) => ({
    userId,
    tipo,
    chave,
    arquivadoEm: agora,
  });
  await tx
    .insert(arquivamentos)
    .values([
      ...trilhas.map((t) => registro("trilha_estudo", t.slug)),
      ...roadmaps.map((slug) => registro("roadmap", slug)),
      ...doEvento.map((e) => registro("evento", e.id)),
      ...cards.map((c) => registro("cards", c.trilha)),
      registro("erros", CHAVE_ERROS_ANTES_DO_PLANO),
    ])
    .onConflictDoNothing();
}

/** Slugs de todos os roadmaps do catálogo: o arquivamento é por usuário, com ou sem progresso. */
async function roadmapsDoCatalogo(tx: QualquerDb) {
  return (await tx.select({ slug: roadmapTrails.slug }).from(roadmapTrails)).map((r) => r.slug);
}

/**
 * Passo 2: Academia de 90 para 80 min, só se ainda estiver às 16:00 com 90 min. Se o usuário
 * mudou o horário ou a duração, não mexe. É o único UPDATE em dado do usuário (fora de `settings`).
 */
async function ajustarAcademia(tx: QualquerDb, userId: string) {
  const candidatas = await tx
    .select({ id: events.id, inicio: events.inicio, fuso: events.fuso })
    .from(events)
    .where(
      and(
        eq(events.userId, userId),
        eq(events.titulo, ACADEMIA.titulo),
        eq(events.duracaoMin, ACADEMIA.minutosAntigos),
        eq(events.diaInteiro, false),
        isNull(events.trackId),
      ),
    );
  const ids = candidatas
    .filter((e) => horaLocal(e.inicio, e.fuso) === ACADEMIA.hora)
    .map((e) => e.id);
  if (!ids.length) return;
  await tx
    .update(events)
    .set({ duracaoMin: ACADEMIA.minutosNovos })
    .where(
      and(
        inArray(events.id, ids),
        eq(events.userId, userId),
        eq(events.duracaoMin, ACADEMIA.minutosAntigos),
      ),
    );
}
