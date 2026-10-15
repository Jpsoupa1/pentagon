import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import s from "./ui.module.css";

type Variante = "primario" | "secundario" | "fantasma" | "claro";
type Base = { variante?: Variante; pequeno?: boolean; largo?: boolean; children: ReactNode };

function classes(v: Variante, pequeno?: boolean, largo?: boolean, extra?: string) {
  return [s.botao, s[v], pequeno && s.pequeno, largo && s.largo, extra].filter(Boolean).join(" ");
}

export function Botao({
  variante = "primario",
  pequeno,
  largo,
  className,
  type = "button",
  ...resto
}: Base & ComponentProps<"button">) {
  return <button type={type} className={classes(variante, pequeno, largo, className)} {...resto} />;
}

export function BotaoLink({
  variante = "secundario",
  pequeno,
  largo,
  className,
  ...resto
}: Base & ComponentProps<typeof Link>) {
  return <Link className={classes(variante, pequeno, largo, className)} {...resto} />;
}
