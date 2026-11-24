import { codigoPlanoSchema, tentativaPlanoSchema } from "@/lib/validacao";
import { corpo } from "@/server/api";
import { rotaDoDono } from "@/server/plano/rota";
import { registrarTentativa } from "@/server/servicos/plano";

/** POST { nota }: registra uma tentativa de prova (0 a 100) no item atual. */
export const POST = rotaDoDono<{ codigo: string }>(
  async ({ userId, req, params }) =>
    registrarTentativa(
      userId,
      codigoPlanoSchema.parse(params.codigo),
      await corpo(req, tentativaPlanoSchema),
    ),
  { reconciliar: true },
);
