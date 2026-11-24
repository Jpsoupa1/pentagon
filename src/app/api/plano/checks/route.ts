import { checkPlanoSchema } from "@/lib/validacao";
import { corpo, rota } from "@/server/api";
import { marcarCheck } from "@/server/servicos/plano";

/** PUT { grupo, codigo?, indice, feito }: marca ou desmarca um item de checklist. */
export const PUT = rota(async ({ userId, req }) =>
  marcarCheck(userId, await corpo(req, checkPlanoSchema)),
);
