import "server-only";
import webpush, { WebPushError } from "web-push";

export type InscricaoPush = { endpoint: string; p256dh: string; auth: string };
export type MensagemPush = { titulo: string; corpo: string; url: string; tag?: string };

let configurado = false;

export function chavePublicaVapid() {
  return process.env.VAPID_PUBLIC_KEY ?? null;
}

function configurar() {
  if (configurado) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:avisos@pentagon.app", pub, priv);
  configurado = true;
  return true;
}

/**
 * Envia para um aparelho. Devolve "expirada" quando o navegador já descartou a inscrição
 * (404/410), para o chamador apagá-la.
 */
export async function enviarPush(
  i: InscricaoPush,
  m: MensagemPush,
): Promise<"ok" | "expirada" | "erro"> {
  if (!configurar()) throw new Error("VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY não definidas.");
  try {
    await webpush.sendNotification(
      { endpoint: i.endpoint, keys: { p256dh: i.p256dh, auth: i.auth } },
      JSON.stringify(m),
      // Sem o cabeçalho Topic: o push da Apple recusa com "BadWebPushTopic".
      // O agrupamento no aparelho fica por conta do `tag` da notificação.
      { TTL: 60 * 60, urgency: "high" },
    );
    return "ok";
  } catch (erro) {
    if (erro instanceof WebPushError && (erro.statusCode === 404 || erro.statusCode === 410))
      return "expirada";
    console.error("Web Push falhou", erro);
    return "erro";
  }
}
