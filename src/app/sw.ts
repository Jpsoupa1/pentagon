/// <reference lib="webworker" />
import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { NetworkFirst, NetworkOnly, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const CACHE_PAGINAS = "paginas";

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  disableDevLogs: true,
  runtimeCaching: [
    // Login, disparo de avisos, cron e feed nunca vêm do cache.
    {
      matcher: ({ url, sameOrigin }) =>
        sameOrigin && /^\/api\/(auth|push|cron|calendario)\b/.test(url.pathname),
      handler: new NetworkOnly(),
    },
    // Exportação sempre fresca.
    {
      matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname === "/api/exportar",
      handler: new NetworkOnly(),
    },
    // Páginas: rede primeiro; sem conexão, a última versão salva (inclui a semana atual).
    {
      matcher: ({ request, sameOrigin }) => sameOrigin && request.mode === "navigate",
      handler: new NetworkFirst({
        cacheName: CACHE_PAGINAS,
        networkTimeoutSeconds: 4,
        matchOptions: { ignoreVary: true },
      }),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [{ url: "/~offline", matcher: ({ request }) => request.destination === "document" }],
  },
});

serwist.addEventListeners();

/**
 * Guarda as telas do app de uma vez, já na primeira abertura. Sem isso, o app instalado no
 * iPhone (que não compartilha o cache do Safari) abria offline direto na página "Sem conexão".
 * Só guarda respostas da própria tela: se a sessão caiu e houve redirecionamento ao login, ignora.
 */
async function aquecer(urls: string[]) {
  const cache = await caches.open(CACHE_PAGINAS);
  await Promise.all(
    urls.map(async (url) => {
      try {
        const r = await fetch(url, { credentials: "same-origin" });
        if (r.ok && !r.redirected) await cache.put(url, r);
      } catch {
        // Sem conexão: fica com a versão já guardada.
      }
    }),
  );
}

self.addEventListener("message", (evento) => {
  const dados = evento.data as { tipo?: string; urls?: unknown } | null;
  if (dados?.tipo !== "aquecer" || !Array.isArray(dados.urls)) return;
  const urls = dados.urls.filter(
    (u): u is string => typeof u === "string" && u.startsWith("/") && !u.startsWith("//"),
  );
  evento.waitUntil(
    aquecer(urls).then(() => (evento.source as Client | null)?.postMessage({ tipo: "aquecido" })),
  );
});
