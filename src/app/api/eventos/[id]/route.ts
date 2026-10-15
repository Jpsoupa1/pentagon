import { eventoSchema } from "@/lib/validacao";
import { corpo, idSchema, rota } from "@/server/api";
import { atualizarComChecagem } from "@/server/servicos/compromissos";
import { apagarEvento, obterEvento } from "@/server/servicos/eventos";

type P = { id: string };

export const GET = rota<P>(async ({ userId, params }) =>
  obterEvento(userId, idSchema.parse(params.id)),
);

export const PUT = rota<P>(
  async ({ userId, params, req }) =>
    atualizarComChecagem(userId, idSchema.parse(params.id), await corpo(req, eventoSchema)),
  { reconciliar: true },
);

export const DELETE = rota<P>(
  async ({ userId, params }) => {
    await apagarEvento(userId, idSchema.parse(params.id));
  },
  { reconciliar: true },
);
