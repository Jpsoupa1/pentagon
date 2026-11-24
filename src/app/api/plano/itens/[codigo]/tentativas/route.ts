import { codigoPlanoSchema, tentativaPlanoSchema } from "@/lib/validacao";
import { corpo, rota } from "@/server/api";
import { registrarTentativa } from "@/server/servicos/plano";

/** POST { nota }: registra uma tentativa de prova (0 a 100) no item atual. */
export const POST = rota<{ codigo: string }>(async ({ userId, req, params }) =>
  registrarTentativa(
    userId,
    codigoPlanoSchema.parse(params.codigo),
    await corpo(req, tentativaPlanoSchema),
  ),
);
