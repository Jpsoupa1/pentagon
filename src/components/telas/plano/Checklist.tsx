import { CaixaSelecao } from "@/components/ui/CaixaSelecao";
import s from "./Plano.module.css";

/** Lista de caixas de seleção; quem marca é o servidor, a tela só mostra o que ele devolveu. */
export function Checklist({
  titulo,
  itens,
  marcados,
  desabilitado,
  aoAlternar,
}: {
  titulo: string;
  itens: readonly string[];
  marcados: readonly number[];
  desabilitado: boolean;
  aoAlternar: (indice: number, feito: boolean) => void;
}) {
  return (
    <fieldset className={s.checklist}>
      <legend className={s.rotuloBloco}>{titulo}</legend>
      <ul>
        {itens.map((texto, i) => (
          <li key={texto}>
            <CaixaSelecao
              checked={marcados.includes(i)}
              disabled={desabilitado}
              onChange={(e) => aoAlternar(i, e.target.checked)}
            >
              {texto}
            </CaixaSelecao>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}
