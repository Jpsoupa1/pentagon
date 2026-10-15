import { z } from "zod";
import { corpo, idSchema, rota } from "@/server/api";
import { decidirConflito } from "@/server/assistente/executar";

/** POST { decisao: "mover" | "manter", indice? }: o usuário decide o conflito (a IA nunca decide). */
export const POST = rota<{ id: string }>(
  async ({ userId, params, req }) => {
    const { decisao, indice } = await corpo(
      req,
      z.object({
        decisao: z.enum(["mover", "manter"]),
        indice: z.number().int().min(0).default(0),
      }),
    );
    return decidirConflito(userId, idSchema.parse(params.id), decisao, indice);
  },
  { reconciliar: true },
);
