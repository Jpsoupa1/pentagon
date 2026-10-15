import type { ReactNode } from "react";
import type { AreaId } from "@/lib/dominio";
import { PontoArea } from "./ChipArea";
import s from "./ui.module.css";

export function LinhaAgenda({
  hora,
  area,
  titulo,
  meta,
  fim,
  passada,
}: {
  hora: string;
  area: AreaId;
  titulo: ReactNode;
  meta?: ReactNode;
  fim?: ReactNode;
  passada?: boolean;
}) {
  return (
    <li className={[s.linha, passada && s.linhaPassada].filter(Boolean).join(" ")}>
      <span className={s.linhaHora}>{hora}</span>
      <PontoArea area={area} />
      <span className={s.linhaTexto}>
        <span className={s.linhaTitulo}>{titulo}</span>
        {meta && <span className={s.linhaMeta}>{meta}</span>}
      </span>
      {fim ?? <span />}
    </li>
  );
}
