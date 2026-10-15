"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import s from "./FolhaInferior.module.css";

/**
 * Folha que sobe do rodapé no iPhone e vira painel centralizado em telas maiores.
 * Usa <dialog> nativo: Esc fecha, o foco fica preso dentro e volta ao botão de origem.
 */
export function FolhaInferior({
  aberta,
  aoFechar,
  titulo,
  children,
}: {
  aberta: boolean;
  aoFechar: () => void;
  titulo: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aberta && !d.open) d.showModal();
    if (!aberta && d.open) d.close();
  }, [aberta]);

  return (
    <dialog
      ref={ref}
      className={s.folha}
      aria-labelledby={idTitulo}
      onClose={aoFechar}
      onClick={(e) => {
        if (e.target === e.currentTarget) aoFechar();
      }}
    >
      <div className={s.conteudo}>
        <div className={s.alca} aria-hidden />
        <header className={s.cabeca}>
          <h2 id={idTitulo} className={s.titulo}>
            {titulo}
          </h2>
          <button type="button" className={s.fechar} onClick={aoFechar} aria-label="Fechar">
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
              <path
                d="M4 4l10 10M14 4L4 14"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>
        {aberta && children}
      </div>
    </dialog>
  );
}
