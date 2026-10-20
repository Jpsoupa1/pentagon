import type { ReactNode } from "react";
import type { AreaId } from "@/lib/dominio";
import { AbrirEdicao, type AlvoEdicao } from "../shell/EditarOcorrencia";
import { PontoArea } from "./ChipArea";
import s from "./ui.module.css";

export function LinhaAgenda({
  hora,
  area,
  titulo,
  meta,
  detalhe,
  fim,
  passada,
  editar,
}: {
  hora: string;
  area: AreaId;
  titulo: ReactNode;
  meta?: ReactNode;
  /** O que fazer (a tarefa do dia no bloco da Segurança), numa linha abaixo do horário. */
  detalhe?: ReactNode;
  fim?: ReactNode;
  passada?: boolean;
  /** Se informado, o título vira botão que abre a edição do compromisso. */
  editar?: AlvoEdicao;
}) {
  return (
    <li className={[s.linha, passada && s.linhaPassada].filter(Boolean).join(" ")}>
      <span className={s.linhaHora}>{hora}</span>
      <PontoArea area={area} />
      <span className={s.linhaTexto}>
        {editar ? (
          <AbrirEdicao alvo={editar} className={s.linhaTitulo}>
            {titulo}
          </AbrirEdicao>
        ) : (
          <span className={s.linhaTitulo}>{titulo}</span>
        )}
        {meta && <span className={s.linhaMeta}>{meta}</span>}
        {detalhe && <span className={s.linhaDetalhe}>{detalhe}</span>}
      </span>
      {fim ?? <span />}
    </li>
  );
}
