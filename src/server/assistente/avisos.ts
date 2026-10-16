import "server-only";

/** Mudanças do assistente reagendam os avisos como as feitas pelas telas. */
export async function reconciliarDepois(userId: string) {
  const { reconciliarAvisos } = await import("../servicos/avisos");
  await reconciliarAvisos(userId).catch((e) => console.error("Reagendar avisos falhou", e));
}
