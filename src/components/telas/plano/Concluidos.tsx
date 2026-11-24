import { Botao } from "@/components/ui/Botao";
import { diaDeConclusao, rotuloDe, type TrilhaDoPlano } from "./comum";
import s from "./Plano.module.css";

/** Lista recolhida do que já foi concluído. O desfazer só aparece quando o servidor permite. */
export function Concluidos({
  concluidos,
  fuso,
  ocupado,
  aoDesfazer,
}: {
  concluidos: TrilhaDoPlano["concluidos"];
  fuso: string;
  ocupado: boolean;
  aoDesfazer: (codigo: string) => void;
}) {
  if (concluidos.length === 0) return null;
  return (
    <details className={s.recolhivel}>
      <summary>Concluídos ({concluidos.length})</summary>
      <ul className={s.linhas}>
        {concluidos.map((c) => (
          <li key={c.codigo}>
            <span>
              {rotuloDe(c)}
              <span className={s.meta}>concluído em {diaDeConclusao(c.concluidoEm, fuso)}</span>
            </span>
            {c.desfazivel && (
              <Botao
                variante="fantasma"
                pequeno
                disabled={ocupado}
                onClick={() => aoDesfazer(c.codigo)}
                aria-label={`Desfazer ${rotuloDe(c)}`}
              >
                Desfazer
              </Botao>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}
