"use client";

import { useRef, type KeyboardEvent } from "react";
import s from "./ui.module.css";

type Opcao<T extends string> = { valor: T; rotulo: string };

/** Grupo de opções exclusivas (padrão ARIA radiogroup, setas trocam a opção). */
export function ControleSegmentado<T extends string>({
  opcoes,
  valor,
  aoMudar,
  rotulo,
}: {
  opcoes: Opcao<T>[];
  valor: T;
  aoMudar: (v: T) => void;
  rotulo: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  function teclado(e: KeyboardEvent) {
    const i = opcoes.findIndex((o) => o.valor === valor);
    const passo =
      e.key === "ArrowRight" || e.key === "ArrowDown"
        ? 1
        : e.key === "ArrowLeft" || e.key === "ArrowUp"
          ? -1
          : 0;
    if (!passo) return;
    e.preventDefault();
    const prox = (i + passo + opcoes.length) % opcoes.length;
    aoMudar(opcoes[prox].valor);
    ref.current?.querySelectorAll<HTMLButtonElement>("button")[prox]?.focus();
  }
  return (
    <div
      ref={ref}
      className={s.segmentado}
      role="radiogroup"
      aria-label={rotulo}
      onKeyDown={teclado}
    >
      {opcoes.map((o) => (
        <button
          key={o.valor}
          type="button"
          role="radio"
          aria-checked={o.valor === valor}
          tabIndex={o.valor === valor ? 0 : -1}
          className={s.segmento}
          onClick={() => aoMudar(o.valor)}
        >
          {o.rotulo}
        </button>
      ))}
    </div>
  );
}
