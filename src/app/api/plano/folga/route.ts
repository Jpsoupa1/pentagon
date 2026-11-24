import { folgaPlanoSchema } from "@/lib/validacao";
import { corpo, rota } from "@/server/api";
import { responderFolga } from "@/server/servicos/plano";

/** PUT { minutos: 0 | 60 | 120 | 180 }: resposta de hoje à pergunta da folga. */
export const PUT = rota(async ({ userId, req }) =>
  responderFolga(userId, await corpo(req, folgaPlanoSchema)),
);
