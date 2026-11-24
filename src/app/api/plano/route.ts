import { rota } from "@/server/api";
import { estadoDoPlano } from "@/server/servicos/plano";

/** GET: o estado do plano (`{ plano: null }` fora do OWNER_EMAILS; `iniciado: false` antes da primeira abertura). */
export const GET = rota(async ({ userId }) => estadoDoPlano(userId));
