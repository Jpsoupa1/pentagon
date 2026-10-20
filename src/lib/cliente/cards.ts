"use client";

import { useCallback, useEffect, useState } from "react";
import { responder as aplicarResposta, type CardCliente, type RespostaCliente } from "../cards";
import type { ModoCard, ResultadoCard } from "../dominio";
import { hojeLocal } from "../tempo";
import { enviar } from "./api";
import { abrirBanco, contarPendentes, sincronizar } from "./fila";

/**
 * Cópia do acervo de flashcards no IndexedDB do aparelho. As duas sessões (do dia e
 * aleatória) rodam em cima dela, então funcionam sem internet. Cada resposta é aplicada
 * aqui na hora e vai para a fila offline; o servidor aplica a mesma regra ao receber.
 */

export type DadosAcervo = {
  fuso: string;
  limite: number;
  cards: CardCliente[];
  respostas: RespostaCliente[];
  baixadoEm: number;
};

type Meta = Pick<DadosAcervo, "fuso" | "limite" | "baixadoEm">;

async function tx<T>(
  lojas: string[],
  modo: IDBTransactionMode,
  fn: (t: IDBTransaction) => IDBRequest<T> | void,
): Promise<T | undefined> {
  const db = await abrirBanco();
  return new Promise((ok, erro) => {
    const t = db.transaction(lojas, modo);
    const req = fn(t);
    t.oncomplete = () => {
      db.close();
      ok(req ? req.result : undefined);
    };
    t.onerror = () => erro(t.error);
    t.onabort = () => erro(t.error);
  });
}

async function lerLocal(): Promise<DadosAcervo | null> {
  const db = await abrirBanco();
  return new Promise((ok, erro) => {
    const t = db.transaction(["meta", "cards", "respostas"], "readonly");
    const meta = t.objectStore("meta").get("acervo") as IDBRequest<Meta | undefined>;
    const cards = t.objectStore("cards").getAll() as IDBRequest<CardCliente[]>;
    const respostas = t.objectStore("respostas").getAll() as IDBRequest<RespostaCliente[]>;
    t.oncomplete = () => {
      db.close();
      ok(meta.result ? { ...meta.result, cards: cards.result, respostas: respostas.result } : null);
    };
    t.onerror = () => erro(t.error);
  });
}

async function gravarLocal(d: DadosAcervo) {
  await tx(["meta", "cards", "respostas"], "readwrite", (t) => {
    const cards = t.objectStore("cards");
    const respostas = t.objectStore("respostas");
    cards.clear();
    respostas.clear();
    for (const c of d.cards) cards.put(c);
    for (const r of d.respostas) respostas.put(r);
    t.objectStore("meta").put({ fuso: d.fuso, limite: d.limite, baixadoEm: d.baixadoEm }, "acervo");
  });
}

const salvarCardLocal = (c: CardCliente) =>
  tx(["cards"], "readwrite", (t) => t.objectStore("cards").put(c));
const removerCardLocal = (id: string) =>
  tx(["cards"], "readwrite", (t) => t.objectStore("cards").delete(id));
const salvarRespostaLocal = (r: RespostaCliente) =>
  tx(["respostas"], "readwrite", (t) => t.objectStore("respostas").put(r));

/** Sobe a cada mudança local: um download que começou antes dela é descartado. */
let versaoLocal = 0;
/** Sobe a cada download: o que terminar depois de um mais novo (ex.: o da abertura da tela,
 * lento, chegando depois do que veio da importação) é descartado. */
let ultimoDownload = 0;

/**
 * Baixa o acervo do servidor, mas só depois de a fila offline esvaziar: assim a cópia
 * do servidor nunca apaga uma resposta que ainda não subiu.
 */
async function baixar(): Promise<DadosAcervo | null> {
  if (!navigator.onLine) return null;
  await sincronizar();
  if (await contarPendentes()) return null;
  const versao = versaoLocal;
  const download = ++ultimoDownload;
  let r: Response;
  try {
    r = await fetch("/api/cards", { cache: "no-store" });
  } catch {
    return null;
  }
  if (!r.ok) return null;
  const json = (await r.json()) as Omit<DadosAcervo, "baixadoEm">;
  if (versao !== versaoLocal || download !== ultimoDownload) return null;
  const dados = { ...json, baixadoEm: Date.now() };
  await gravarLocal(dados).catch(() => undefined);
  return dados;
}

/** Lê a cópia local (só ela; sem baixar nada). Para o bloco da tela Hoje sem conexão. */
export const lerAcervoLocal = () => lerLocal().catch(() => null);

export type EstadoAcervo = "carregando" | "pronto" | "sem-copia";

export function useAcervo() {
  const [dados, setDados] = useState<DadosAcervo | null>(null);
  const [estado, setEstado] = useState<EstadoAcervo>("carregando");

  const recarregar = useCallback(async () => {
    const remoto = await baixar();
    if (remoto) {
      setDados(remoto);
      setEstado("pronto");
    }
    return remoto;
  }, []);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const local = await lerAcervoLocal();
      if (vivo && local) {
        setDados(local);
        setEstado("pronto");
      }
      const remoto = await baixar();
      if (!vivo) return;
      if (remoto) {
        setDados(remoto);
        setEstado("pronto");
      } else if (!local) setEstado((e) => (e === "pronto" ? e : "sem-copia"));
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const trocarCard = useCallback((card: CardCliente) => {
    versaoLocal++;
    setDados((d) => d && { ...d, cards: d.cards.map((c) => (c.id === card.id ? card : c)) });
    void salvarCardLocal(card).catch(() => undefined);
  }, []);

  /** Aplica a resposta na cópia local e manda para o servidor (ou para a fila, sem conexão). */
  const responder = useCallback(
    (card: CardCliente, resultado: ResultadoCard, modo: ModoCard) => {
      if (!dados) return;
      const hoje = hojeLocal(new Date(), dados.fuso);
      const resposta: RespostaCliente = {
        id: crypto.randomUUID(),
        cardId: card.id,
        data: hoje,
        resultado,
        modo,
      };
      trocarCard(aplicarResposta(card, resultado, modo, hoje));
      setDados((d) => d && { ...d, respostas: [...d.respostas, resposta] });
      void salvarRespostaLocal(resposta).catch(() => undefined);
      void enviar("POST", "/api/cards/respostas", {
        ...resposta,
        respondidaEm: new Date().toISOString(),
      });
    },
    [dados, trocarCard],
  );

  const editar = useCallback(
    async (card: CardCliente, mudancas: Partial<CardCliente>) => {
      const r = await enviar("PATCH", `/api/cards/${card.id}`, mudancas);
      if (r.ok) trocarCard({ ...card, ...mudancas });
      return r;
    },
    [trocarCard],
  );

  const apagar = useCallback(async (id: string) => {
    const r = await enviar("DELETE", `/api/cards/${id}`);
    if (r.ok) {
      versaoLocal++;
      setDados((d) => d && { ...d, cards: d.cards.filter((c) => c.id !== id) });
      void removerCardLocal(id).catch(() => undefined);
    }
    return r;
  }, []);

  const hoje = dados ? hojeLocal(new Date(), dados.fuso) : null;
  return { dados, estado, hoje, recarregar, responder, editar, apagar };
}
