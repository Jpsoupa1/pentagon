import { revisaoSchema } from "@/lib/validacao";
import { corpo, idSchema, rota } from "@/server/api";
import { obterRevisao, salvarRevisao } from "@/server/servicos/revisao";

/** GET: a revisão de sexta da semana (ou null se ainda não começou). */
export const GET = rota<{ semana: string }>(async ({ userId, params }) =>
  obterRevisao(userId, idSchema.parse(params.semana)),
);

/** PUT { etapas?, nota?, pontosFracos? } grava a revisão de sexta da semana. */
export const PUT = rota<{ semana: string }>(async ({ userId, params, req }) =>
  salvarRevisao(userId, idSchema.parse(params.semana), await corpo(req, revisaoSchema)),
);
