import { idSchema, rota } from "@/server/api";
import { confirmarAcao } from "@/server/assistente/executar";

/** Confirma uma exclusão proposta pelo assistente. */
export const POST = rota<{ id: string }>(
  async ({ userId, params }) => confirmarAcao(userId, idSchema.parse(params.id)),
  { reconciliar: true },
);
