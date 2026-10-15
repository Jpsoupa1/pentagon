import { z } from "zod";
import { avaliacaoSchema } from "@/lib/validacao";
import { corpo, idSchema, rota } from "@/server/api";
import {
  apagarAvaliacao,
  atualizarAvaliacao,
  concluirAvaliacao,
  obterAvaliacao,
} from "@/server/servicos/avaliacoes";

type P = { id: string };

export const GET = rota<P>(async ({ userId, params }) =>
  obterAvaliacao(userId, idSchema.parse(params.id)),
);

export const PUT = rota<P>(async ({ userId, params, req }) =>
  atualizarAvaliacao(userId, idSchema.parse(params.id), await corpo(req, avaliacaoSchema)),
);

/** PATCH { concluida: boolean } */
export const PATCH = rota<P>(async ({ userId, params, req }) => {
  const { concluida } = await corpo(req, z.object({ concluida: z.boolean() }));
  return concluirAvaliacao(userId, idSchema.parse(params.id), concluida);
});

export const DELETE = rota<P>(async ({ userId, params }) => {
  await apagarAvaliacao(userId, idSchema.parse(params.id));
});
