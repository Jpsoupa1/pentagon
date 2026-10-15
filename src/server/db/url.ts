const MODOS_QUE_VIRAM_VERIFY_FULL = new Set(["prefer", "require", "verify-ca"]);

/**
 * O `pg` 8 já trata `sslmode=require` (o que a Neon entrega) como `verify-full`, mas avisa
 * a cada conexão que isso muda no `pg` 9. Pedimos `verify-full` explicitamente: mesmo
 * comportamento de hoje, sem o aviso, e continua seguro depois da atualização.
 */
export function urlDoBanco(url: string) {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return url;
  }
  const modo = u.searchParams.get("sslmode");
  if (!modo || !MODOS_QUE_VIRAM_VERIFY_FULL.has(modo) || u.searchParams.has("uselibpqcompat"))
    return url;
  u.searchParams.set("sslmode", "verify-full");
  return u.toString();
}
