import { hojeLocal } from "@/lib/tempo";
import { revisarErroSchema } from "@/lib/validacao";
import { corpo, idSchema, rota } from "@/server/api";
import { obterAjustes } from "@/server/servicos/ajustes";
import { apagarErro, revisarErro } from "@/server/servicos/revisao";

/** PATCH { resultado: "acertei" | "errei" }: acertou sai da lista; errou volta em 21 dias. */
export const PATCH = rota<{ id: string }>(async ({ userId, params, req }) => {
  const { resultado } = await corpo(req, revisarErroSchema);
  const { fuso } = await obterAjustes(userId);
  return revisarErro(userId, idSchema.parse(params.id), resultado, hojeLocal(new Date(), fuso));
});

export const DELETE = rota<{ id: string }>(async ({ userId, params }) => {
  await apagarErro(userId, idSchema.parse(params.id));
});
