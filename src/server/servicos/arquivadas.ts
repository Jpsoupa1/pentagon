import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { dataDoArquivamento, nomeDoArquivado, ORDEM_ARQUIVADOS } from "@/lib/arquivadas";
import { db } from "../db";
import { arquivamentos, events, roadmapTrails, studyTracks } from "../db/schema";
import { obterAjustes } from "./ajustes";

export type ItemArquivado = { id: string; nome: string; arquivadoEm: string };

type Nomes = Map<string, string>;

async function nomesPorChave(
  chaves: string[],
  buscar: (chaves: string[]) => Promise<{ chave: string; nome: string }[]>,
): Promise<Nomes> {
  if (!chaves.length) return new Map();
  return new Map((await buscar(chaves)).map((r) => [r.chave, r.nome]));
}

/** O que o usuário arquivou, com nome legível e data. Só leitura: nada aqui reativa. */
export async function listarArquivadas(userId: string): Promise<ItemArquivado[]> {
  const [linhas, { fuso }] = await Promise.all([
    db().select().from(arquivamentos).where(eq(arquivamentos.userId, userId)),
    obterAjustes(userId),
  ]);
  const chaves = (tipo: (typeof linhas)[number]["tipo"]) =>
    linhas.filter((l) => l.tipo === tipo).map((l) => l.chave);

  const [trilhas, roadmaps, eventos] = await Promise.all([
    nomesPorChave(chaves("trilha_estudo"), (slugs) =>
      db()
        .select({ chave: studyTracks.slug, nome: studyTracks.nome })
        .from(studyTracks)
        .where(and(eq(studyTracks.userId, userId), inArray(studyTracks.slug, slugs))),
    ),
    nomesPorChave(chaves("roadmap"), (slugs) =>
      db()
        .select({ chave: roadmapTrails.slug, nome: roadmapTrails.nome })
        .from(roadmapTrails)
        .where(inArray(roadmapTrails.slug, slugs)),
    ),
    nomesPorChave(chaves("evento"), (ids) =>
      db()
        .select({ chave: events.id, nome: events.titulo })
        .from(events)
        .where(and(eq(events.userId, userId), inArray(events.id, ids))),
    ),
  ]);
  const catalogo: Partial<Record<(typeof linhas)[number]["tipo"], Nomes>> = {
    trilha_estudo: trilhas,
    roadmap: roadmaps,
    evento: eventos,
  };

  return linhas
    .map((l) => ({
      id: `${l.tipo}:${l.chave}`,
      ordem: ORDEM_ARQUIVADOS.indexOf(l.tipo),
      nome: nomeDoArquivado(l.tipo, l.chave, catalogo[l.tipo]?.get(l.chave) ?? null),
      arquivadoEm: l.arquivadoEm,
    }))
    .sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, "pt-BR"))
    .map((i) => ({
      id: i.id,
      nome: i.nome,
      arquivadoEm: dataDoArquivamento(i.arquivadoEm, fuso),
    }));
}
