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

/** URL que parece de produção (Neon ou Vercel): testes e ensaios nunca rodam contra ela. */
export const pareceBancoDeProducao = (url: string) => /neon\.tech|vercel/i.test(url);

export function recusarBancoDeProducao(url: string) {
  if (pareceBancoDeProducao(url)) throw new Error("Recusado: o banco parece ser de produção.");
}

/** Só `localhost` ou `127.0.0.1` de verdade (o host da URL, não um pedaço dela). */
export function ehBancoLocal(url: string) {
  try {
    return (
      !pareceBancoDeProducao(url) && ["localhost", "127.0.0.1"].includes(new URL(url).hostname)
    );
  } catch {
    return false;
  }
}
