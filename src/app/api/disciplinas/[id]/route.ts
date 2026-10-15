import { disciplinaSchema } from "@/lib/validacao";
import { corpo, idSchema, rota } from "@/server/api";
import {
  apagarDisciplina,
  atualizarDisciplina,
  detalheDisciplina,
} from "@/server/servicos/disciplinas";

type P = { id: string };

export const GET = rota<P>(async ({ userId, params }) =>
  detalheDisciplina(userId, idSchema.parse(params.id)),
);

export const PUT = rota<P>(async ({ userId, params, req }) =>
  atualizarDisciplina(userId, idSchema.parse(params.id), await corpo(req, disciplinaSchema)),
);

export const DELETE = rota<P>(async ({ userId, params }) => {
  await apagarDisciplina(userId, idSchema.parse(params.id));
});
