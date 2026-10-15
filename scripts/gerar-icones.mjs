// Gera os ícones do PWA a partir do logo (pentágono com um lado de cada cor).
// Uso: npm run icons  (usa o sharp que já vem com o Next.js)
import { writeFileSync } from "node:fs";
import sharp from "sharp";

const cores = ["#4361EE", "#F2643D", "#12A37A", "#8E4FD6", "#E0A100"];

function svg({ tamanho, fundo, escala }) {
  const c = tamanho / 2;
  const r = (tamanho / 2) * escala;
  const v = Array.from({ length: 5 }, (_, i) => {
    const a = ((-90 + i * 72) * Math.PI) / 180;
    return [c + r * Math.cos(a), c + 0.04 * tamanho + r * Math.sin(a)];
  });
  const traco = tamanho * 0.075 * (escala / 0.5);
  const lados = cores
    .map((cor, i) => {
      const [x1, y1] = v[i];
      const [x2, y2] = v[(i + 1) % 5];
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${cor}" stroke-width="${traco}" stroke-linecap="round"/>`;
    })
    .join("");
  const bg = fundo ? `<rect width="${tamanho}" height="${tamanho}" fill="${fundo}"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${tamanho}" height="${tamanho}" viewBox="0 0 ${tamanho} ${tamanho}">${bg}${lados}</svg>`;
}

writeFileSync("public/icons/icon.svg", svg({ tamanho: 64, fundo: null, escala: 0.4 }));
const alvos = [
  ["icon-192.png", 192, 0.62],
  ["icon-512.png", 512, 0.62],
  ["icon-maskable-512.png", 512, 0.44],
  ["apple-touch-icon.png", 180, 0.58],
];
for (const [nome, t, escala] of alvos) {
  await sharp(Buffer.from(svg({ tamanho: t, fundo: "#FFFFFF", escala })))
    .png()
    .toFile(`public/icons/${nome}`);
}
console.log("Ícones gerados em public/icons");
