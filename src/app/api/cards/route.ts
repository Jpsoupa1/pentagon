import { rota } from "@/server/api";
import { acervo } from "@/server/servicos/cards";

/** GET: o acervo inteiro, as respostas desde segunda e o limite diário (cópia offline do aparelho). */
export const GET = rota(async ({ userId }) => acervo(userId));
