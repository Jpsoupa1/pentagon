import { rota } from "@/server/api";
import { enviarTeste } from "@/server/servicos/avisos";

export const POST = rota(async ({ userId }) => enviarTeste(userId));
