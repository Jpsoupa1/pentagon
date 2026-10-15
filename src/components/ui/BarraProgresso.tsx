import s from "./ui.module.css";

export function BarraProgresso({
  valor,
  rotulo,
  escura,
}: {
  /** De 0 a 1 */
  valor: number;
  rotulo: string;
  escura?: boolean;
}) {
  const pct = Math.round(Math.min(1, Math.max(0, valor)) * 100);
  return (
    <div
      className={[s.barra, escura && s.barraEscura].filter(Boolean).join(" ")}
      role="progressbar"
      aria-label={rotulo}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
    >
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}
