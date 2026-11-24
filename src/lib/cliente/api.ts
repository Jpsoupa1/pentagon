import { enfileirar } from "./fila";

export type Resultado<T> =
  | { ok: true; dados: T; enfileirado?: false }
  | { ok: true; enfileirado: true; dados?: undefined }
  | { ok: false; erro: string; campos?: Record<string, string[]>; detalhes?: unknown };

export const SEM_CONEXAO = "Sem conexão. Tente de novo quando a internet voltar.";

/**
 * Envia uma alteração à API. Sem conexão, guarda na fila offline e devolve `enfileirado`.
 * Com `semFila`, nada vai para a fila: sem conexão o resultado é uma recusa (`SEM_CONEXAO`).
 * Use `semFila` em escritas que não podem ser reenviadas depois (não idempotentes).
 */
export async function enviar<T = unknown>(
  metodo: "POST" | "PUT" | "PATCH" | "DELETE",
  url: string,
  corpo?: unknown,
  { semFila = false }: { semFila?: boolean } = {},
): Promise<Resultado<T>> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    if (semFila) return { ok: false, erro: SEM_CONEXAO };
    await enfileirar({ metodo, url, corpo });
    return { ok: true, enfileirado: true };
  }
  let r: Response;
  try {
    r = await fetch(url, {
      method: metodo,
      headers: corpo === undefined ? undefined : { "Content-Type": "application/json" },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
  } catch {
    if (semFila) return { ok: false, erro: SEM_CONEXAO };
    await enfileirar({ metodo, url, corpo });
    return { ok: true, enfileirado: true };
  }
  if (r.status === 204) return { ok: true, dados: undefined as T };
  const json = await r.json().catch(() => ({}));
  if (!r.ok)
    return {
      ok: false,
      erro: json.erro ?? "Não foi possível salvar.",
      campos: json.campos,
      detalhes: json.detalhes,
    };
  return { ok: true, dados: json as T };
}
