import type { ReactNode } from "react";
import s from "./ui.module.css";

export function EstadoVazio({
  children,
  acao,
  centro,
}: {
  children: ReactNode;
  acao?: ReactNode;
  centro?: boolean;
}) {
  return (
    <div className={[s.vazio, centro && s.vazioCentro].filter(Boolean).join(" ")}>
      <p>{children}</p>
      {acao}
    </div>
  );
}
