import { blocoPlanoSchema, trocaPlanoSchema } from "@/lib/validacao";
import { corpo, rota } from "@/server/api";
import { trocarBloco } from "@/server/servicos/plano";

/** PUT { escolha: "item:<código>" | "cards" | null }: troca o conteúdo do bloco só hoje. */
export const PUT = rota<{ bloco: string }>(async ({ userId, req, params }) =>
  trocarBloco(userId, blocoPlanoSchema.parse(params.bloco), await corpo(req, trocaPlanoSchema)),
);
