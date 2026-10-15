import type { ComponentProps, ReactNode } from "react";
import s from "./ui.module.css";

export function Cartao({ className, ...resto }: ComponentProps<"section">) {
  return <section className={[s.cartao, className].filter(Boolean).join(" ")} {...resto} />;
}

export function CartaoCabeca({
  titulo,
  acao,
  nivel = 2,
}: {
  titulo: ReactNode;
  acao?: ReactNode;
  nivel?: 2 | 3;
}) {
  const H = nivel === 2 ? "h2" : "h3";
  return (
    <div className={s.cartaoCabeca}>
      <H className={s.cartaoTitulo}>{titulo}</H>
      {acao && <div className={s.cartaoAcao}>{acao}</div>}
    </div>
  );
}

export function Rotulo({ children, className, ...resto }: ComponentProps<"span">) {
  return (
    <span className={[s.rotulo, className].filter(Boolean).join(" ")} {...resto}>
      {children}
    </span>
  );
}
