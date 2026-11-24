import { getTableColumns, notInArray, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { PgTable } from "drizzle-orm/pg-core";
import { carregarCatalogo } from "../../lib/plano";
import { planoCatalogo, planoFases, planoItens, planoTrilhas } from "../db/schema";
import planoJson from "./plano.json";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QualquerDb = NodePgDatabase<any>;

/** `set` do upsert: cada coluna (menos as da chave) recebe o valor que tentou entrar. */
function atualizarCom(tabela: PgTable, chave: string[]) {
  return Object.fromEntries(
    Object.entries(getTableColumns(tabela))
      .filter(([, coluna]) => !chave.includes(coluna.name))
      .map(([prop, coluna]) => [prop, sql.raw(`excluded."${coluna.name}"`)]),
  );
}

/**
 * Grava o catálogo do plano AI Engineer (igual para todos). Idempotente: roda a cada deploy.
 * Diferente do Roadmap, nunca apaga: o item que saiu do seed fica com `ativo = false` e o
 * progresso dos usuários nele continua. Seed inválido lança antes de gravar qualquer coisa.
 */
export async function semearCatalogoPlano(db: QualquerDb, json: unknown = planoJson) {
  const cat = carregarCatalogo(json);
  await db.transaction(async (tx) => {
    await tx
      .insert(planoCatalogo)
      .values({
        id: 1,
        versao: cat.versao,
        padraoEntrega: cat.padraoDeEntrega,
        recrutamento: cat.recrutamento,
      })
      .onConflictDoUpdate({
        target: planoCatalogo.id,
        set: {
          versao: cat.versao,
          padraoEntrega: cat.padraoDeEntrega,
          recrutamento: cat.recrutamento,
        },
      });

    await tx
      .insert(planoTrilhas)
      .values(cat.trilhas.map((t, posicao) => ({ ...t, posicao })))
      .onConflictDoUpdate({ target: planoTrilhas.slug, set: atualizarCom(planoTrilhas, ["slug"]) });

    await tx
      .insert(planoFases)
      .values(cat.fases.map((f, posicao) => ({ ...f, posicao })))
      .onConflictDoUpdate({ target: planoFases.numero, set: atualizarCom(planoFases, ["numero"]) });

    await tx
      .insert(planoItens)
      .values(
        cat.itens.map((i) => ({
          ...i,
          fase: i.fase ?? null,
          estudar: i.estudar ?? null,
          recurso: i.recurso ?? null,
        })),
      )
      .onConflictDoUpdate({ target: planoItens.codigo, set: atualizarCom(planoItens, ["codigo"]) });

    await tx
      .update(planoItens)
      .set({ ativo: false })
      .where(
        notInArray(
          planoItens.codigo,
          cat.itens.map((i) => i.codigo),
        ),
      );
  });
  return { versao: cat.versao, itens: cat.itens.length };
}
