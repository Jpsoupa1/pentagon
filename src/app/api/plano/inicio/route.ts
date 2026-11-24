import { planoInicioSchema } from "@/lib/validacao";
import { corpo } from "@/server/api";
import { rotaDoDono } from "@/server/plano/rota";
import { iniciarPlano } from "@/server/servicos/plano";

/** POST { marcados, incluirRequisitos? }: primeira abertura, uma vez só. */
export const POST = rotaDoDono(
  async ({ userId, req }) => iniciarPlano(userId, await corpo(req, planoInicioSchema)),
  { reconciliar: true },
);
