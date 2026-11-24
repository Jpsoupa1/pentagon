import "server-only";
import { rota } from "../api";
import { exigirDono } from "../servicos/plano";

/**
 * `rota` das escritas do plano: confere o dono antes de ler o corpo e os parâmetros, para quem não
 * tem plano receber sempre 403 (e nunca 400 que revele como o corpo é validado).
 */
export function rotaDoDono<P = Record<string, never>>(
  fn: Parameters<typeof rota<P>>[0],
  opcoes?: Parameters<typeof rota<P>>[1],
) {
  return rota<P>(async (ctx) => {
    await exigirDono(ctx.userId);
    return fn(ctx);
  }, opcoes);
}
