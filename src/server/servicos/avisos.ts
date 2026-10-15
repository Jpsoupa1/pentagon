import "server-only";
import { and, eq, gt, inArray, lt, sql } from "drizzle-orm";
import { addDias, hojeLocal, horaLocal } from "@/lib/tempo";
import { avisosDeSessoes, diferencaAvisos, type AlvoAviso } from "../avisos/planejar";
import { criarAgendador, type Agendador } from "../avisos/agendador";
import { enviarPush, type MensagemPush } from "../avisos/push";
import { db } from "../db";
import { notifications, pushSubscriptions } from "../db/schema";
import { obterAjustes } from "./ajustes";
import { ocorrencias } from "./agenda";

const URL_DO_ALVO: Record<AlvoAviso, string> = {
  sessao: "/estudos",
  evento: "/agenda",
  avaliacao: "/provas",
  lembrete: "/lembretes",
};

export async function listarInscricoes(userId: string) {
  return db().select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
}

/**
 * Garante que o QStash tenha exatamente os avisos das próximas 48 h:
 * agenda os que faltam e cancela os que não valem mais. Sem aparelho inscrito, cancela tudo.
 */
export async function reconciliarAvisos(
  userId: string,
  agora = new Date(),
  agendador: Agendador = criarAgendador(),
) {
  const ajustes = await obterAjustes(userId);
  const temAparelho = (await listarInscricoes(userId)).length > 0;
  const hoje = hojeLocal(agora, ajustes.fuso);
  const desejados = temAparelho
    ? avisosDeSessoes(
        await ocorrencias(userId, { de: hoje, ate: addDias(hoje, 3) }),
        ajustes.avisoMin,
        agora,
        (d) => horaLocal(d, ajustes.fuso),
      )
    : [];
  const existentes = await db()
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.status, "agendada"),
        gt(notifications.enviarEm, agora),
      ),
    );
  const { criar, cancelar } = diferencaAvisos(existentes, desejados);

  for (const c of cancelar) {
    if (c.qstashMessageId) await agendador.cancelar(c.qstashMessageId);
  }
  if (cancelar.length) {
    await db()
      .update(notifications)
      .set({ status: "cancelada" })
      .where(
        inArray(
          notifications.id,
          cancelar.map((c) => c.id),
        ),
      );
  }

  for (const d of criar) {
    const [linha] = await db()
      .insert(notifications)
      .values({
        userId,
        alvoTipo: d.alvoTipo,
        alvoId: d.alvoId,
        ocorrencia: d.ocorrencia,
        enviarEm: d.enviarEm,
        titulo: d.titulo,
        corpo: d.corpo,
      })
      // Um aviso cancelado antes pode voltar (ex.: sessão desmarcada como feita).
      .onConflictDoUpdate({
        target: [notifications.alvoTipo, notifications.alvoId, notifications.enviarEm],
        set: { status: "agendada", titulo: d.titulo, corpo: d.corpo, qstashMessageId: null },
      })
      .returning({ id: notifications.id });
    const messageId = await agendador.agendar(linha.id, d.enviarEm);
    if (messageId)
      await db()
        .update(notifications)
        .set({ qstashMessageId: messageId })
        .where(eq(notifications.id, linha.id));
  }
  return { agendados: criar.length, cancelados: cancelar.length, qstash: agendador.ativo };
}

async function enviarParaAparelhos(userId: string, m: MensagemPush) {
  const inscricoes = await listarInscricoes(userId);
  let entregues = 0;
  for (const i of inscricoes) {
    const r = await enviarPush(i, m);
    if (r === "ok") entregues++;
    if (r === "expirada")
      await db().delete(pushSubscriptions).where(eq(pushSubscriptions.id, i.id));
  }
  return { aparelhos: inscricoes.length, entregues };
}

/** Chamado pelo QStash no horário: envia o aviso, se ainda estiver valendo. */
export async function dispararAviso(id: string) {
  const [aviso] = await db().select().from(notifications).where(eq(notifications.id, id));
  if (!aviso || aviso.status !== "agendada")
    return { enviado: false, motivo: "não está mais agendado" };
  const r = await enviarParaAparelhos(aviso.userId, {
    titulo: aviso.titulo,
    corpo: aviso.corpo ?? "",
    url: URL_DO_ALVO[aviso.alvoTipo],
    tag: `${aviso.alvoTipo}-${aviso.alvoId}`,
  });
  await db()
    .update(notifications)
    .set({ status: r.entregues > 0 ? "enviada" : "falhou" })
    .where(eq(notifications.id, id));
  return { enviado: r.entregues > 0, ...r };
}

export async function enviarTeste(userId: string) {
  return enviarParaAparelhos(userId, {
    titulo: "Pentagon",
    corpo: "Avisos ativos neste aparelho.",
    url: "/ajustes",
    tag: "teste",
  });
}

export async function salvarInscricao(
  userId: string,
  i: { endpoint: string; p256dh: string; auth: string; aparelho: string | null },
) {
  await db()
    .insert(pushSubscriptions)
    .values({ userId, ...i })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { userId, p256dh: i.p256dh, auth: i.auth, aparelho: i.aparelho },
    });
}

export async function removerInscricao(userId: string, endpoint: string) {
  await db()
    .delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)));
}

/** Cron diário: reconcilia todos os usuários com aparelho inscrito e limpa avisos órfãos. */
export async function reconciliarTodos(agora = new Date()) {
  const usuarios = await db()
    .selectDistinct({ userId: pushSubscriptions.userId })
    .from(pushSubscriptions);
  const agendador = criarAgendador();
  let agendados = 0;
  let cancelados = 0;
  for (const u of usuarios) {
    const r = await reconciliarAvisos(u.userId, agora, agendador);
    agendados += r.agendados;
    cancelados += r.cancelados;
  }
  // Agendados há mais de 1 h que nunca dispararam: a mensagem se perdeu.
  const orfaos = await db()
    .update(notifications)
    .set({ status: "falhou" })
    .where(
      and(
        eq(notifications.status, "agendada"),
        lt(notifications.enviarEm, sql`now() - interval '1 hour'`),
      ),
    )
    .returning({ id: notifications.id });
  return { usuarios: usuarios.length, agendados, cancelados, orfaos: orfaos.length };
}
