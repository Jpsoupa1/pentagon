import type { AreaId } from "@/lib/dominio";
import { AREAS } from "@/lib/areas";
import { duracaoTexto } from "@/lib/tempo";
import { pontos, verticesPentagono } from "./geometria";
import s from "./GraficoPentagono.module.css";

/** Radar de 5 eixos (um por área) com as horas planejadas na semana. */
export function GraficoPentagono({
  minutos,
  tamanho = 220,
}: {
  minutos: Record<AreaId, number>;
  tamanho?: number;
}) {
  const c = 110;
  const r = 70;
  const maximo = Math.max(...AREAS.map((a) => minutos[a.id]), 60);
  const eixos = verticesPentagono(c, c, r);
  const rotulos = verticesPentagono(c, c, r + 24);
  const valores = verticesPentagono(c, c, r).map(([x, y], i) => {
    const f = Math.max(minutos[AREAS[i].id] / maximo, 0.04);
    return [c + (x - c) * f, c + (y - c) * f] as [number, number];
  });
  const total = AREAS.reduce((t, a) => t + minutos[a.id], 0);
  const descricao = AREAS.map((a) => `${a.nome}: ${duracaoTexto(minutos[a.id])}`).join("; ");

  return (
    <figure className={s.figura}>
      <svg
        viewBox="0 0 220 220"
        width={tamanho}
        height={tamanho}
        role="img"
        aria-label={`Horas planejadas na semana. ${descricao}.`}
        className={s.svg}
      >
        {[1, 0.66, 0.33].map((f) => (
          <polygon key={f} points={pontos(verticesPentagono(c, c, r * f))} className={s.grade} />
        ))}
        {eixos.map(([x, y], i) => (
          <line key={i} x1={c} y1={c} x2={x} y2={y} className={s.eixo} />
        ))}
        {total > 0 && <polygon points={pontos(valores)} className={s.valor} />}
        {valores.map(([x, y], i) =>
          total > 0 ? <circle key={i} cx={x} cy={y} r={3.5} fill={AREAS[i].cor} /> : null,
        )}
        {rotulos.map(([x, y], i) => (
          <text
            key={i}
            x={x}
            y={y}
            textAnchor={Math.abs(x - c) < 4 ? "middle" : x < c ? "end" : "start"}
            dominantBaseline="middle"
            className={s.rotulo}
          >
            <tspan>{AREAS[i].curto}</tspan>
            <tspan x={x} dy="13" className={s.horas}>
              {Math.round((minutos[AREAS[i].id] / 60) * 10) / 10} h
            </tspan>
          </text>
        ))}
      </svg>
    </figure>
  );
}
