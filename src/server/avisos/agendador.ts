import { Client } from "@upstash/qstash";

/** Quem entrega a mensagem no horário exato. Em produção é o QStash. */
export interface Agendador {
  readonly ativo: boolean;
  agendar(avisoId: string, quando: Date): Promise<string | null>;
  cancelar(messageId: string): Promise<void>;
}

/** URL pública de produção (o QStash não alcança previews protegidos nem localhost). */
export function urlPublica(): string | null {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return null;
}

class AgendadorQStash implements Agendador {
  readonly ativo = true;
  constructor(
    private readonly cliente: Client,
    private readonly destino: string,
  ) {}

  async agendar(avisoId: string, quando: Date) {
    const r = await this.cliente.publishJSON({
      url: this.destino,
      body: { id: avisoId },
      notBefore: Math.floor(quando.getTime() / 1000),
      deduplicationId: avisoId,
      retries: 3,
    });
    return "messageId" in r ? r.messageId : null;
  }

  async cancelar(messageId: string) {
    try {
      await this.cliente.messages.delete(messageId);
    } catch (erro) {
      // Já entregue ou expirada: nada a cancelar.
      console.warn("QStash: não cancelou", messageId, erro);
    }
  }
}

/** Sem QStash configurado (dev, preview): registra no banco mas não agenda entrega. */
const agendadorInativo: Agendador = {
  ativo: false,
  async agendar() {
    return null;
  },
  async cancelar() {},
};

export function criarAgendador(): Agendador {
  const token = process.env.QSTASH_TOKEN;
  const base = urlPublica();
  if (!token || !base) return agendadorInativo;
  const cliente = new Client({ token, baseUrl: process.env.QSTASH_URL || undefined });
  return new AgendadorQStash(cliente, `${base}/api/push/disparar`);
}
