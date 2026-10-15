import { enfileirar } from "./fila";

export type Resultado<T> =
  | { ok: true; dados: T; enfileirado?: false }
  | { ok: true; enfileirado: true; dados?: undefined }
  | { ok: false; erro: string; campos?: Record<string, string[]>; detalhes?: unknown };

/**
 * Envia uma alteração à API. Sem conexão, guarda na fila offline e devolve `enfileirado`.
 */
export async function enviar<T = unknown>(
  metodo: "POST" | "PUT" | "PATCH" | "DELETE",
  url: string,
  corpo?: unknown,
): Promise<Resultado<T>> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
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
