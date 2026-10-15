import { idSchema, rota } from "@/server/api";
import { visaoDaExecucao } from "@/server/assistente/visao";

export const GET = rota<{ id: string }>(async ({ userId, params }) =>
  visaoDaExecucao(userId, idSchema.parse(params.id)),
);
