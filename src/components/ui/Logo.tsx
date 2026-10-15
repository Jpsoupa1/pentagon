import { AREAS } from "@/lib/areas";
import { verticesPentagono } from "./geometria";

/** Pentágono com cada lado na cor de uma área. */
export function Logo({ tamanho = 28, comNome = false }: { tamanho?: number; comNome?: boolean }) {
  const v = verticesPentagono(16, 17, 13);
  const svg = (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 32 32"
      aria-hidden={comNome}
      role={comNome ? undefined : "img"}
    >
      {!comNome && <title>Pentagon</title>}
      {AREAS.map((a, i) => {
        const [x1, y1] = v[i];
        const [x2, y2] = v[(i + 1) % 5];
        return (
          <line
            key={a.id}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={a.cor}
            strokeWidth={3.4}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
  if (!comNome) return svg;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        fontWeight: 700,
        fontSize: 17,
        letterSpacing: "-0.01em",
      }}
    >
      {svg}
      Pentagon
    </span>
  );
}
