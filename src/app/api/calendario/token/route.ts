import { rota } from "@/server/api";
import { gerarToken, revogarTokens } from "@/server/servicos/calendario";

/** Gera um endereço novo para o feed (o anterior para de funcionar). */
export const POST = rota(async ({ userId }) => gerarToken(userId), { status: 201 });

/** Revoga o endereço atual. */
export const DELETE = rota(async ({ userId }) => {
  await revogarTokens(userId);
});
