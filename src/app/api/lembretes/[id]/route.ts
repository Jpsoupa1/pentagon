import { z } from "zod";
import { lembreteSchema } from "@/lib/validacao";
import { corpo, idSchema, rota } from "@/server/api";
import { apagarLembrete, atualizarLembrete, concluirLembrete } from "@/server/servicos/lembretes";

type P = { id: string };

export const PUT = rota<P>(
  async ({ userId, params, req }) =>
    atualizarLembrete(userId, idSchema.parse(params.id), await corpo(req, lembreteSchema)),
  { reconciliar: true },
);

/** PATCH { concluido: boolean } */
export const PATCH = rota<P>(
  async ({ userId, params, req }) => {
    const { concluido } = await corpo(req, z.object({ concluido: z.boolean() }));
    return concluirLembrete(userId, idSchema.parse(params.id), concluido);
  },
  { reconciliar: true },
);

export const DELETE = rota<P>(
  async ({ userId, params }) => {
    await apagarLembrete(userId, idSchema.parse(params.id));
  },
  { reconciliar: true },
);
