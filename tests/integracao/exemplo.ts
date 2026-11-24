import { readFileSync } from "node:fs";

/** O arquivo de exemplo que vai no repositório (docs/cards/exemplo.json). */
export const exemplo = JSON.parse(
  readFileSync(new URL("../../docs/cards/exemplo.json", import.meta.url), "utf8"),
) as { cards: Record<string, unknown>[] };
