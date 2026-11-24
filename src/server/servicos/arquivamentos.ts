import "server-only";
import { db } from "../db";
import { arquivadosDe, type Arquivados } from "../plano/arquivados";

export type { Arquivados };

/**
 * Único ponto de entrada das consultas que escondem o que o usuário arquivou. Chame uma vez por
 * consulta e passe o resultado aos filtros de `plano/arquivados.ts`.
 */
export const arquivados = (userId: string): Promise<Arquivados> => arquivadosDe(db(), userId);
