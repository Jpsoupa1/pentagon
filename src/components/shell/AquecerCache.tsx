"use client";

import { useEffect } from "react";
import { MENU, SECUNDARIO } from "./navegacao";

// As telas de Cards rodam da cópia local do acervo: guardadas, as duas sessões abrem offline.
const PAGINAS = [
  ...[...MENU, ...SECUNDARIO].map((i) => i.href),
  "/cards/dia",
  "/cards/aleatorio",
  "/cards/acervo",
  "/cards/importar",
];
const CHAVE = "pentagon:aquecido-em";
const INTERVALO_MS = 10 * 60_000;

/**
 * Pede ao service worker para guardar todas as telas, para o app abrir offline mesmo
 * que a pessoa nunca tenha passado por elas. Repete no máximo a cada 10 minutos.
 */
export function AquecerCache() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !navigator.onLine) return;
    let ultimo = 0;
    try {
      ultimo = Number(localStorage.getItem(CHAVE) ?? 0);
    } catch {}
    if (Date.now() - ultimo < INTERVALO_MS) return;
    navigator.serviceWorker.ready.then((reg) => {
      reg.active?.postMessage({ tipo: "aquecer", urls: PAGINAS });
      try {
        localStorage.setItem(CHAVE, String(Date.now()));
      } catch {}
    });
  }, []);
  return null;
}
