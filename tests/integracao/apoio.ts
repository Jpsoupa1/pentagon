import type Anthropic from "@anthropic-ai/sdk";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { semearTrilha } from "@/server/estudos/seed";
import { semearRotina } from "@/server/rotina/seed";
import type { ClienteClaude } from "@/server/assistente/executar";

export const EMAIL = "assistente-teste@pentagon.local";

/** Quarta-feira, 21/10/2026, 10:00 em São Paulo: academia 16:00 e sessão de estudo 14:00. */
export const AGORA = new Date("2026-10-21T13:00:00Z");
export const HOJE = "2026-10-21";
export const AMANHA = "2026-10-22";

/** Usuário novo, com a trilha e a rotina do seed, para cada teste começar do zero. */
export async function usuarioDeTeste() {
  const url = process.env.DATABASE_URL ?? "";
  if (/neon\.tech|vercel/.test(url)) throw new Error("Recusado: banco parece ser de produção.");
  await db().delete(users).where(eq(users.email, EMAIL));
  const [u] = await db()
    .insert(users)
    .values({ name: "Teste do assistente", email: EMAIL })
    .returning();
  await semearTrilha(db(), u.id);
  await semearRotina(db(), u.id, AGORA);
  return u.id;
}

export async function apagarUsuarioDeTeste() {
  await db().delete(users).where(eq(users.email, EMAIL));
}

// ---------------------------------------------------------------- Claude simulado

type Bloco = { type: "tool_use"; name: string; input: unknown } | { type: "text"; text: string };

let seq = 0;

export function mensagem(
  blocos: Bloco[],
  stop: Anthropic.Beta.BetaMessage["stop_reason"] = "tool_use",
): Anthropic.Beta.BetaMessage {
  return {
    id: `msg_${++seq}`,
    type: "message",
    role: "assistant",
    model: "claude-sonnet-5-5",
    stop_reason: stop,
    stop_sequence: null,
    content: blocos.map((b) => (b.type === "tool_use" ? { ...b, id: `toolu_${++seq}` } : b)),
    usage: {
      input_tokens: 900,
      output_tokens: 120,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 2600,
    },
  } as unknown as Anthropic.Beta.BetaMessage;
}

export const ferramenta = (name: string, input: unknown): Bloco => ({
  type: "tool_use",
  name,
  input,
});

export type Passo = (
  params: Anthropic.Beta.MessageCreateParamsNonStreaming,
) => Anthropic.Beta.BetaMessage;

/** Cliente que devolve as respostas do roteiro em ordem e guarda o que recebeu. */
export function roteiro(...passos: Passo[]) {
  const chamadas: Anthropic.Beta.MessageCreateParamsNonStreaming[] = [];
  const cliente: ClienteClaude = {
    async criar(params) {
      chamadas.push(structuredClone(params));
      const passo = passos[chamadas.length - 1];
      if (!passo) throw new Error("O roteiro acabou: o assistente chamou a API mais vezes.");
      return passo(params);
    },
  };
  return { cliente, chamadas };
}

/** Lê os dados que o servidor mandou no contexto (o que um modelo de verdade leria). */
export function dadosDoContexto(params: Anthropic.Beta.MessageCreateParamsNonStreaming) {
  const primeira = params.messages[0].content as string;
  const json = /<dados_do_usuario>\n([\s\S]*?)\n<\/dados_do_usuario>/.exec(primeira)![1];
  return JSON.parse(json) as {
    hoje_e_amanha: { item: string; titulo: string; data: string; inicio: string | null }[];
    disciplinas: { id: string; nome: string; sigla: string }[];
  };
}

export function itemPorTitulo(
  params: Anthropic.Beta.MessageCreateParamsNonStreaming,
  titulo: string,
  data: string,
) {
  const i = dadosDoContexto(params).hoje_e_amanha.find(
    (x) => x.titulo === titulo && x.data === data,
  );
  if (!i) throw new Error(`"${titulo}" não está no contexto de ${data}`);
  return i.item;
}
