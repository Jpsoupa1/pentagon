import { z } from "zod";
import { rota } from "@/server/api";
import { somarContador } from "@/server/servicos/plano";

/** POST: soma 1 no contador do recrutamento, na semana de hoje. */
export const POST = rota<{ chave: string }>(async ({ userId, params }) =>
  somarContador(userId, z.string().min(1).max(40).parse(params.chave)),
);
