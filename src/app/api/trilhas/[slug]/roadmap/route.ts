import { rota } from "@/server/api";
import { obterRoadmap } from "@/server/servicos/roadmap";

/** GET: a trilha inteira (fases, recursos, provas e prática) com o progresso do usuário. */
export const GET = rota<{ slug: string }>(async ({ userId, params }) =>
  obterRoadmap(userId, params.slug),
);
