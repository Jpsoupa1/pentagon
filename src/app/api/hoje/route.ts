import { rota } from "@/server/api";
import { painelHoje } from "@/server/servicos/agenda";

export const GET = rota(async ({ userId }) => painelHoje(userId));
