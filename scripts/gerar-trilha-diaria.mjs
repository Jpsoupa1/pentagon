// Gera a trilha diária da Segurança (src/server/roadmap/trilhas/seguranca-diaria.json) a partir da
// tabela de docs/seguranca/roadmap-profissional.md. Uso: npm run gerar:trilha-diaria
import { readFileSync, writeFileSync } from "node:fs";

const md = readFileSync("docs/seguranca/roadmap-profissional.md", "utf8");
const trecho = md.split("<!-- trilha-diaria:inicio -->")[1]?.split("<!-- trilha-diaria:fim -->")[0];
if (!trecho) throw new Error("Marcadores da trilha diária não encontrados.");

const dias = [];
let semana = null;
for (const linha of trecho.split("\n")) {
  const celulas = linha
    .split("|")
    .slice(1, -1)
    .map((c) => c.trim());
  const m = celulas.length === 3 && /^\w{3} (\d{2})\/(\d{2})\/(\d{4})$/.exec(celulas[1]);
  if (!m) continue;
  if (celulas[0]) {
    const [n, tema] = celulas[0].split(" · ");
    semana = { numero: Number(n), tema };
  }
  dias.push({
    data: `${m[3]}-${m[2]}-${m[1]}`,
    semana: semana.numero,
    tema: semana.tema,
    tarefa: celulas[2],
  });
}
writeFileSync(
  "src/server/roadmap/trilhas/seguranca-diaria.json",
  JSON.stringify(dias, null, 2) + "\n",
);
console.log(`${dias.length} sessões, de ${dias[0].data} a ${dias.at(-1).data}.`);
