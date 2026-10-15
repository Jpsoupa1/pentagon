/**
 * Fila de alterações feitas sem internet, guardada no IndexedDB do aparelho.
 * Cada item é uma requisição à API que será reenviada, na ordem, quando a conexão voltar.
 */

export type Pendente = {
  id?: number;
  metodo: string;
  url: string;
  corpo?: unknown;
  criadoEm: number;
};

const BANCO = "pentagon";
const LOJA = "fila";
export const EVENTO_FILA = "pentagon:fila";

function abrir(): Promise<IDBDatabase> {
  return new Promise((ok, erro) => {
    const req = indexedDB.open(BANCO, 1);
    req.onupgradeneeded = () =>
      req.result.createObjectStore(LOJA, { keyPath: "id", autoIncrement: true });
    req.onsuccess = () => ok(req.result);
    req.onerror = () => erro(req.error);
  });
}

async function transacao<T>(
  modo: IDBTransactionMode,
  fn: (loja: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await abrir();
  return new Promise((ok, erro) => {
    const tx = db.transaction(LOJA, modo);
    const req = fn(tx.objectStore(LOJA));
    tx.oncomplete = () => {
      db.close();
      ok(req.result);
    };
    tx.onerror = () => erro(tx.error);
  });
}

function avisar() {
  window.dispatchEvent(new Event(EVENTO_FILA));
}

export async function enfileirar(p: Omit<Pendente, "id" | "criadoEm">) {
  await transacao("readwrite", (l) => l.add({ ...p, criadoEm: Date.now() }));
  avisar();
}

export async function listarPendentes(): Promise<Pendente[]> {
  return transacao("readonly", (l) => l.getAll() as IDBRequest<Pendente[]>);
}

export async function contarPendentes(): Promise<number> {
  try {
    return await transacao("readonly", (l) => l.count());
  } catch {
    return 0;
  }
}

async function remover(id: number) {
  await transacao("readwrite", (l) => l.delete(id));
}

let sincronizando = false;

/**
 * Reenvia a fila na ordem. Para no primeiro erro de rede (tenta de novo depois);
 * respostas 4xx são descartadas para não travar a fila com um item inválido.
 */
export async function sincronizar(): Promise<{ enviados: number; descartados: number }> {
  if (sincronizando || !navigator.onLine) return { enviados: 0, descartados: 0 };
  sincronizando = true;
  let enviados = 0;
  let descartados = 0;
  try {
    for (const p of await listarPendentes()) {
      let r: Response;
      try {
        r = await fetch(p.url, {
          method: p.metodo,
          headers: p.corpo === undefined ? undefined : { "Content-Type": "application/json" },
          body: p.corpo === undefined ? undefined : JSON.stringify(p.corpo),
        });
      } catch {
        break;
      }
      if (r.status >= 500 || r.status === 401) break;
      await remover(p.id!);
      if (r.ok) enviados++;
      else descartados++;
    }
  } finally {
    sincronizando = false;
    avisar();
  }
  return { enviados, descartados };
}
