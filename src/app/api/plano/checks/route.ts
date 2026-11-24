import { checkPlanoSchema } from "@/lib/validacao";
import { corpo } from "@/server/api";
import { rotaDoDono } from "@/server/plano/rota";
import { marcarCheck } from "@/server/servicos/plano";

/** PUT { grupo, codigo?, indice, feito }: marca ou desmarca um item de checklist. */
export const PUT = rotaDoDono(async ({ userId, req }) =>
  marcarCheck(userId, await corpo(req, checkPlanoSchema)),
);
