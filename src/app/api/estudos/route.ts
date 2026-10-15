import { rota } from "@/server/api";
import { listarTrilhas } from "@/server/servicos/estudos";

export const GET = rota(async ({ userId }) => listarTrilhas(userId));
