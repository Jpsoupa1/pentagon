import { hojeLocal } from "@/lib/tempo";
import { erroSchema } from "@/lib/validacao";
import { corpo, rota } from "@/server/api";
import { obterAjustes } from "@/server/servicos/ajustes";
import { criarErro, errosParaRevisar } from "@/server/servicos/revisao";

/** GET: erros do caderno para a revisão espaçada desta semana. */
export const GET = rota(async ({ userId }) => {
  const { fuso } = await obterAjustes(userId);
  return errosParaRevisar(userId, hojeLocal(new Date(), fuso));
});

/** POST { data, tema, errei, correto, revisarEm?, origem?, sessaoId? } anota um erro no caderno. */
export const POST = rota(
  async ({ userId, req }) => criarErro(userId, await corpo(req, erroSchema)),
  {
    status: 201,
  },
);
