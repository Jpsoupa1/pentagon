"use client";

import { useSyncExternalStore } from "react";

const assinarMinuto = (avisar: () => void) => {
  const t = setInterval(avisar, 15_000);
  return () => clearInterval(t);
};
const minutoAtual = () => Math.floor(Date.now() / 60_000) * 60_000;

/** Relógio que muda a cada minuto. No servidor (e na hidratação) usa `inicialMs`. */
export function useRelogio(inicialMs: number | null = null): number | null {
  return useSyncExternalStore(assinarMinuto, minutoAtual, () => inicialMs);
}

const assinarConexao = (avisar: () => void) => {
  window.addEventListener("online", avisar);
  window.addEventListener("offline", avisar);
  return () => {
    window.removeEventListener("online", avisar);
    window.removeEventListener("offline", avisar);
  };
};

export function useOnline(): boolean {
  return useSyncExternalStore(
    assinarConexao,
    () => navigator.onLine,
    () => true,
  );
}

export function useMidia(consulta: string): boolean {
  return useSyncExternalStore(
    (avisar) => {
      const m = window.matchMedia(consulta);
      m.addEventListener("change", avisar);
      return () => m.removeEventListener("change", avisar);
    },
    () => window.matchMedia(consulta).matches,
    () => false,
  );
}
