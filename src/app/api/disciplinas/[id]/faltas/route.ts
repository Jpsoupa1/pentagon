import { faltaSchema } from "@/lib/validacao";
import { corpo, idSchema, rota } from "@/server/api";
import { registrarFalta } from "@/server/servicos/disciplinas";

export const POST = rota<{ id: string }>(
  async ({ userId, params, req }) =>
    registrarFalta(userId, idSchema.parse(params.id), await corpo(req, faltaSchema)),
  { status: 201 },
);
