import { folgaPlanoSchema } from "@/lib/validacao";
import { corpo } from "@/server/api";
import { rotaDoDono } from "@/server/plano/rota";
import { responderFolga } from "@/server/servicos/plano";

/** PUT { minutos: 0 | 60 | 120 | 180 }: resposta de hoje à pergunta da folga. */
export const PUT = rotaDoDono(async ({ userId, req }) =>
  responderFolga(userId, await corpo(req, folgaPlanoSchema)),
);
