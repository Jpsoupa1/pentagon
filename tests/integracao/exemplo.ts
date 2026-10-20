import { readFileSync } from "node:fs";

/** O arquivo de exemplo que vai no repositório (docs/cards/exemplo-cka.json). */
export const exemplo = JSON.parse(
  readFileSync(new URL("../../docs/cards/exemplo-cka.json", import.meta.url), "utf8"),
) as { cards: Record<string, unknown>[] };
