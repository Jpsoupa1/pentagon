import { idSchema, rota } from "@/server/api";
import { desfazerExecucao } from "@/server/assistente/executar";
import { visaoDaExecucao } from "@/server/assistente/visao";

/** "Desfazer tudo": volta as ações na ordem inversa e avisa o que mudou depois e ficou como está. */
export const POST = rota<{ id: string }>(
  async ({ userId, params }) => {
    const id = idSchema.parse(params.id);
    const { avisos } = await desfazerExecucao(userId, id);
    return { avisos, execucao: await visaoDaExecucao(userId, id) };
  },
  { reconciliar: true },
);
