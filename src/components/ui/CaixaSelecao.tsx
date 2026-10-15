"use client";

import type { ComponentProps, ReactNode } from "react";
import s from "./ui.module.css";

export function CaixaSelecao({
  children,
  ...input
}: { children: ReactNode } & Omit<ComponentProps<"input">, "type">) {
  return (
    <label className={s.caixa}>
      <input type="checkbox" {...input} />
      <span className={s.caixaTexto}>{children}</span>
    </label>
  );
}
