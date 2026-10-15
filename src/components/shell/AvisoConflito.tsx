import { Botao } from "../ui/Botao";
import f from "./Form.module.css";

export type DetalhesConflito = {
  conflitos: { quando: string; titulo: string; com: string; comHorario: string }[];
  total: number;
};

/** Lista os choques de horário que o servidor encontrou e oferece salvar mesmo assim. */
export function AvisoConflito({
  detalhes,
  ocupado,
  aoConfirmar,
}: {
  detalhes: DetalhesConflito;
  ocupado?: boolean;
  aoConfirmar: () => void;
}) {
  const resto = detalhes.total - detalhes.conflitos.length;
  return (
    <div className={f.conflito} role="alert">
      <strong>Esse horário choca com outro compromisso</strong>
      <ul>
        {detalhes.conflitos.map((c, i) => (
          <li key={i}>
            <span className="mono">{c.quando}</span> · choca com <strong>{c.com}</strong>{" "}
            <span className="mono">({c.comHorario})</span>
          </li>
        ))}
        {resto > 0 && <li>e mais {resto} vez(es).</li>}
      </ul>
      <Botao variante="secundario" pequeno onClick={aoConfirmar} disabled={ocupado}>
        Salvar mesmo assim
      </Botao>
    </div>
  );
}
