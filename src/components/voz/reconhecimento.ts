"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Reconhecimento de fala do próprio navegador (Web Speech API). O áudio nunca passa pelo Pentagon:
// só o texto transcrito vai para o servidor.
//
// Onde NÃO funciona: no app instalado na Tela de Início do iPhone (a WebKit não expõe a API ali,
// embora a detecção diga que sim). Nesse caso o modo voz usa o ditado do teclado do iOS.

type Resultado = { isFinal: boolean; 0: { transcript: string } };
type EventoResultado = { resultIndex: number; results: ArrayLike<Resultado> };
type Reconhecedor = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: EventoResultado) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};
type Construtor = new () => Reconhecedor;

function construtor(): Construtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: Construtor;
    webkitSpeechRecognition?: Construtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** App instalado na Tela de Início do iPhone/iPad. */
export function appInstaladoNoIos() {
  if (typeof window === "undefined") return false;
  const ios =
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.userAgent));
  const standalone =
    (navigator as unknown as { standalone?: boolean }).standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches;
  return ios && standalone;
}

export function vozDisponivel() {
  return !!construtor() && !appInstaladoNoIos();
}

export type EstadoEscuta = { final: string; provisorio: string; ouvindo: boolean };

/**
 * Escuta em português e devolve a transcrição ao vivo (palavras ainda não confirmadas em
 * `provisorio`). `aoTerminar` recebe o texto completo quando a escuta acaba.
 */
export function useReconhecimento(
  aoTerminar: (texto: string) => void,
  aoFalhar: (motivo: string) => void,
) {
  const [estado, setEstado] = useState<EstadoEscuta>({ final: "", provisorio: "", ouvindo: false });
  const rec = useRef<Reconhecedor | null>(null);
  const texto = useRef("");
  const callbacks = useRef({ aoTerminar, aoFalhar });
  useEffect(() => {
    callbacks.current = { aoTerminar, aoFalhar };
  });

  const ouvir = useCallback(() => {
    const C = construtor();
    if (!C) return aoFalhar("indisponivel");
    const r = new C();
    r.lang = "pt-BR";
    r.continuous = true;
    r.interimResults = true;
    texto.current = "";
    let falhou = false;
    r.onresult = (e) => {
      let final = "";
      let provisorio = "";
      for (let i = 0; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else provisorio += t;
      }
      texto.current = `${final}${provisorio}`.trim();
      setEstado({ final, provisorio, ouvindo: true });
    };
    r.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      falhou = true;
      callbacks.current.aoFalhar(e.error);
    };
    r.onend = () => {
      rec.current = null;
      setEstado((s) => ({ ...s, ouvindo: false }));
      if (!falhou) callbacks.current.aoTerminar(texto.current);
    };
    rec.current = r;
    setEstado({ final: "", provisorio: "", ouvindo: true });
    try {
      r.start();
    } catch {
      aoFalhar("indisponivel");
    }
  }, [aoFalhar]);

  const parar = useCallback(() => rec.current?.stop(), []);
  const cancelar = useCallback(() => {
    if (!rec.current) return;
    rec.current.onend = null;
    rec.current.abort();
    rec.current = null;
    setEstado({ final: "", provisorio: "", ouvindo: false });
  }, []);

  useEffect(() => () => rec.current?.abort(), []);
  return { ...estado, ouvir, parar, cancelar };
}
