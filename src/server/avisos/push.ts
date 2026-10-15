import "server-only";
import webpush from "web-push";

export type InscricaoPush = { endpoint: string; p256dh: string; auth: string };
export type MensagemPush = { titulo: string; corpo: string; url: string; tag?: string };

export function chavePublicaVapid() {
  return process.env.VAPID_PUBLIC_KEY ?? null;
}

function chavesVapid() {
  const publica = process.env.VAPID_PUBLIC_KEY;
  const privada = process.env.VAPID_PRIVATE_KEY;
  if (!publica || !privada) return null;
  return { publica, privada, assunto: process.env.VAPID_SUBJECT ?? "mailto:avisos@pentagon.app" };
}

/**
 * Envia para um aparelho. Devolve "expirada" quando o navegador já descartou a inscrição
 * (404/410), para o chamador apagá-la.
 *
 * A biblioteca só cifra a mensagem; o cabeçalho VAPID e o envio ficam aqui, com `URL` e
 * `fetch`, porque o caminho dela usa `url.parse` e enche os logs de avisos de depreciação.
 */
export async function enviarPush(
  i: InscricaoPush,
  m: MensagemPush,
): Promise<"ok" | "expirada" | "erro"> {
  const vapid = chavesVapid();
  if (!vapid) throw new Error("VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY não definidas.");
  try {
    const pedido = webpush.generateRequestDetails(
      { endpoint: i.endpoint, keys: { p256dh: i.p256dh, auth: i.auth } },
      JSON.stringify(m),
      // Sem o cabeçalho Topic: o push da Apple recusa com "BadWebPushTopic".
      // O agrupamento no aparelho fica por conta do `tag` da notificação.
      { TTL: 60 * 60, urgency: "high" },
    );
    const { origin } = new URL(i.endpoint);
    const { Authorization } = webpush.getVapidHeaders(
      origin,
      vapid.assunto,
      vapid.publica,
      vapid.privada,
      "aes128gcm",
    );
    const resposta = await fetch(pedido.endpoint, {
      method: pedido.method,
      headers: { ...pedido.headers, Authorization },
      body: pedido.body ? new Uint8Array(pedido.body) : undefined,
      signal: AbortSignal.timeout(10_000),
    });
    if (resposta.ok) return "ok";
    if (resposta.status === 404 || resposta.status === 410) return "expirada";
    console.error("Web Push recusado", resposta.status, await resposta.text());
    return "erro";
  } catch (erro) {
    console.error("Web Push falhou", erro);
    return "erro";
  }
}
