import type { ReactNode } from "react";
import s from "./Pagina.module.css";

export function CabecalhoPagina({
  titulo,
  sobre,
  acoes,
}: {
  titulo: string;
  sobre?: ReactNode;
  acoes?: ReactNode;
}) {
  return (
    <header className={s.cabecalho}>
      <div>
        {sobre && <p className={s.sobre}>{sobre}</p>}
        <h1 className={s.titulo}>{titulo}</h1>
      </div>
      {acoes && <div className={s.acoes}>{acoes}</div>}
    </header>
  );
}

export { s as layout };
