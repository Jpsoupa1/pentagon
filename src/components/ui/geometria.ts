/** Vértices de um pentágono regular com o primeiro no topo, em sentido horário. */
export function verticesPentagono(cx: number, cy: number, r: number): [number, number][] {
  return Array.from({ length: 5 }, (_, i) => {
    const ang = ((-90 + i * 72) * Math.PI) / 180;
    return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)];
  });
}

export const pontos = (v: [number, number][]) =>
  v.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
