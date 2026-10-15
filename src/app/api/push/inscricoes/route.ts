import { z } from "zod";
import { corpo, rota } from "@/server/api";
import { removerInscricao, salvarInscricao } from "@/server/servicos/avisos";

const inscricaoSchema = z.object({
  endpoint: z.url().max(2000),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
  aparelho: z.string().max(200).nullish(),
});

/** Salva a inscrição Web Push deste aparelho e agenda os avisos das próximas 48 h. */
export const POST = rota(
  async ({ userId, req }) => {
    const i = await corpo(req, inscricaoSchema);
    await salvarInscricao(userId, {
      endpoint: i.endpoint,
      p256dh: i.keys.p256dh,
      auth: i.keys.auth,
      aparelho: i.aparelho ?? null,
    });
    return { ok: true };
  },
  { status: 201, reconciliar: true },
);

export const DELETE = rota(
  async ({ userId, req }) => {
    const { endpoint } = await corpo(req, z.object({ endpoint: z.url() }));
    await removerInscricao(userId, endpoint);
  },
  { reconciliar: true },
);
