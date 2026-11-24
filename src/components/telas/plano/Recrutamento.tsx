import { Botao } from "@/components/ui/Botao";
import { Cartao, CartaoCabeca } from "@/components/ui/Cartao";
import { Checklist } from "./Checklist";
import type { PlanoIniciado } from "./comum";
import s from "./Plano.module.css";

/** Aparece só quando o estado traz o recrutamento (depois de B5 e C8). */
export function Recrutamento({
  recrutamento,
  ocupado,
  aoMarcar,
  aoSomar,
}: {
  recrutamento: NonNullable<PlanoIniciado["recrutamento"]>;
  ocupado: boolean;
  aoMarcar: (indice: number, feito: boolean) => void;
  aoSomar: (chave: string) => void;
}) {
  return (
    <Cartao aria-labelledby="recrutamento">
      <CartaoCabeca titulo={<span id="recrutamento">Recrutamento</span>} />
      <Checklist
        titulo="Checklist"
        itens={recrutamento.checklist.map((c) => c.texto)}
        marcados={recrutamento.checklist.flatMap((c, i) => (c.feito ? [i] : []))}
        desabilitado={ocupado}
        aoAlternar={aoMarcar}
      />
      <ul className={s.linhas}>
        {recrutamento.contadores.map((c) => (
          <li key={c.chave}>
            <span>
              {c.titulo}: {c.feitas} de {c.metaSemanal} nesta semana
            </span>
            <Botao
              variante="secundario"
              pequeno
              disabled={ocupado}
              onClick={() => aoSomar(c.chave)}
              aria-label={`Registrar mais uma: ${c.titulo}`}
            >
              Mais uma
            </Botao>
          </li>
        ))}
      </ul>
    </Cartao>
  );
}
