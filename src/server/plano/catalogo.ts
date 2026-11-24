import "server-only";
import { asc } from "drizzle-orm";
import type { BlocoPlano, Catalogo, ItemPlano, SlugTrilha } from "@/lib/plano";
import { db } from "../db";
import { planoCatalogo, planoFases, planoItens, planoTrilhas } from "../db/schema";

/**
 * Catálogo gravado pelo seed, na forma que as regras de `lib/plano` esperam. Traz também os itens
 * inativos (`ativo = false`): o progresso neles continua guardado, e as regras já os ignoram.
 */
export async function catalogoDoBanco(): Promise<Catalogo> {
  const [[geral], trilhas, fases, itens] = await Promise.all([
    db().select().from(planoCatalogo),
    db().select().from(planoTrilhas).orderBy(asc(planoTrilhas.posicao)),
    db().select().from(planoFases).orderBy(asc(planoFases.posicao)),
    db().select().from(planoItens).orderBy(asc(planoItens.trilha), asc(planoItens.posicao)),
  ]);
  if (!geral) throw new Error("Catálogo do plano não semeado. Rode npm run db:migrate.");
  return {
    versao: geral.versao,
    trilhas: trilhas.map((t) => ({
      slug: t.slug as SlugTrilha,
      nome: t.nome,
      bloco: t.bloco as BlocoPlano,
    })),
    fases: fases.map((f) => ({ numero: f.numero, nome: f.nome })),
    padraoDeEntrega: geral.padraoEntrega,
    recrutamento: geral.recrutamento,
    itens: itens.map((i): ItemPlano => ({
      codigo: i.codigo,
      trilha: i.trilha as SlugTrilha,
      fase: i.fase ?? undefined,
      titulo: i.titulo,
      estudar: i.estudar ?? undefined,
      recurso: i.recurso ?? undefined,
      criterio: i.criterio,
      horas: i.horas,
      requisitos: i.requisitos,
      avaliacao: i.avaliacao,
      antesDeComecar: i.antesDeComecar,
      etapas: i.etapas,
      entrega: i.entrega,
      opcional: i.opcional,
      posicao: i.posicao,
      ativo: i.ativo,
    })),
  };
}
