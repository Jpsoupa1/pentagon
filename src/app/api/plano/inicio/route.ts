import { planoInicioSchema } from "@/lib/validacao";
import { corpo, rota } from "@/server/api";
import { iniciarPlano } from "@/server/servicos/plano";

/** POST { marcados, incluirRequisitos? }: primeira abertura, uma vez só. */
export const POST = rota(async ({ userId, req }) =>
  iniciarPlano(userId, await corpo(req, planoInicioSchema)),
);
