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
        cacheName: "paginas",
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
