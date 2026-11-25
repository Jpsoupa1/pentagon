import { confirmacaoAssistenteSchema } from "@/lib/validacao";
import { idSchema, rota } from "@/server/api";
import { confirmarAcao } from "@/server/assistente/executar";

/**
 * Confirma uma proposta do assistente (apagar, ou concluir um conteúdo do plano). O corpo é
 * opcional: no plano traz o conteúdo escolhido e a nota digitada no cartão.
 */
export const POST = rota<{ id: string }>(
  async ({ userId, req, params }) => {
    const bruto = await req.text();
    const escolha = confirmacaoAssistenteSchema.parse(bruto ? JSON.parse(bruto) : {});
    return confirmarAcao(userId, idSchema.parse(params.id), escolha);
  },
  { reconciliar: true },
);
