import { eventoSchema } from "@/lib/validacao";
import { corpo, idSchema, rota } from "@/server/api";
import { apagarEvento, atualizarEvento, obterEvento } from "@/server/servicos/eventos";

type P = { id: string };

export const GET = rota<P>(async ({ userId, params }) =>
  obterEvento(userId, idSchema.parse(params.id)),
);

export const PUT = rota<P>(async ({ userId, params, req }) =>
  atualizarEvento(userId, idSchema.parse(params.id), await corpo(req, eventoSchema)),
);

export const DELETE = rota<P>(async ({ userId, params }) => {
  await apagarEvento(userId, idSchema.parse(params.id));
});
