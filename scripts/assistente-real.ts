// Teste manual: chama a API do Claude DE VERDADE (gasta créditos). Só roda sob comando:
//   npm run assistente:real
// Usa o banco local (nunca o de produção) com um usuário de teste e mostra o consumo por pedido.
import "./env";
import { custoEmDolares } from "../src/lib/assistente";
import { db } from "../src/server/db";
import { assistantRuns } from "../src/server/db/schema";
import { executarAssistente, modeloConfigurado } from "../src/server/assistente/executar";
import { visaoDaExecucao } from "../src/server/assistente/visao";
import { eq } from "drizzle-orm";
import { AGORA, apagarUsuarioDeTeste, usuarioDeTeste } from "../tests/integracao/apoio";

const PEDIDOS = [
  "Muda a academia de hoje para as duas da tarde e me lembra de revisar Cálculo amanhã às três",
  "O que eu tenho hoje à tarde?",
  "Marca a sessão de estudo de hoje como feita",
  "Coloca uma prova de Desenvolvimento Web dia 30, às 19:10",
  "Falta na aula de Cálculo de ontem",
  "quem descobriu o Brasil?",
  "marca a academia às 15h e me conta uma piada",
  "apaga o lembrete de revisar Cálculo",
];

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("Defina ANTHROPIC_API_KEY no .env.local.");
  const userId = await usuarioDeTeste();
  const linhas = [];
  try {
    for (const texto of PEDIDOS) {
      const inicio = Date.now();
      const { id } = await executarAssistente(userId, texto, { agora: AGORA });
      const v = await visaoDaExecucao(userId, id);
      const [r] = await db().select().from(assistantRuns).where(eq(assistantRuns.id, id));
      const tokens = {
        entrada: r.tokensEntrada,
        saida: r.tokensSaida,
        cacheEscrita: r.tokensCacheEscrita,
        cacheLeitura: r.tokensCacheLeitura,
      };
      linhas.push({
        pedido: texto.slice(0, 48),
        tipo: v.tipo,
        acoes: v.acoes.map((a) => `${a.tipo}:${a.titulo}`).join(", ") || "-",
        ...tokens,
        usd: custoEmDolares(r.modelo, tokens).toFixed(4),
        seg: ((Date.now() - inicio) / 1000).toFixed(1),
      });
      console.log(JSON.stringify(v, null, 2));
    }
  } finally {
    await apagarUsuarioDeTeste();
  }
  console.log(`\nModelo: ${modeloConfigurado()}`);
  console.table(linhas);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
