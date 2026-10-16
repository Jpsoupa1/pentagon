// API do Claude simulada para os testes de ponta a ponta (nada de rede nem créditos).
// O app aponta para cá com ANTHROPIC_BASE_URL. Responde a poucos pedidos conhecidos, imitando
// as chamadas de ferramenta que o modelo faria.
import { createServer, type Server } from "node:http";

type Bloco = Record<string, unknown>;
type Mensagem = { role: string; content: string | Bloco[] };

let seq = 0;

function resposta(content: Bloco[], stop = "tool_use") {
  return {
    id: `msg_falso_${++seq}`,
    type: "message",
    role: "assistant",
    model: "claude-sonnet-5-5",
    stop_reason: stop,
    stop_sequence: null,
    content: content.map((c) => (c.type === "tool_use" ? { ...c, id: `toolu_falso_${++seq}` } : c)),
    usage: {
      input_tokens: 850,
      output_tokens: 110,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 2400,
    },
  };
}

const usar = (name: string, input: unknown) => ({ type: "tool_use", name, input });

function decidir(mensagens: Mensagem[]) {
  const ultima = mensagens.at(-1)!;
  // Já executou as ferramentas: termina.
  if (Array.isArray(ultima.content) && ultima.content.some((b) => b.type === "tool_result")) {
    return resposta([usar("responder", { tipo: "acoes", resumo: "feito" })]);
  }
  const contexto = mensagens[0].content as string;
  const pedido = /<pedido>\n([\s\S]*?)\n<\/pedido>/.exec(contexto)?.[1].toLowerCase() ?? "";
  const amanha = /Amanhã = (\d{4}-\d{2}-\d{2})/.exec(contexto)?.[1];
  const hoje = /Hoje = (\d{4}-\d{2}-\d{2})/.exec(contexto)?.[1];

  if (/brasil|piada|derivada|email|tempo/.test(pedido) && !/lembra|marca/.test(pedido)) {
    return resposta([usar("responder", { tipo: "fora_do_escopo", resumo: "fora" })]);
  }
  if (pedido.startsWith("o que eu tenho")) {
    const dia = pedido.includes("amanhã") ? amanha : hoje;
    return resposta([
      usar("responder", { tipo: "consulta", resumo: "agenda", janela: { de: dia, ate: dia } }),
    ]);
  }
  const academia =
    (/"item":"(evento:[^"]+)","titulo":"Academia","area":"pessoal","data":"(\d{4}-\d{2}-\d{2})"/g.exec(
      contexto,
    ) ?? [])[1];
  if (pedido.includes("academia") && academia) {
    return resposta([
      usar("alterar_compromisso", { item: academia, escopo: "ocorrencia", nova_hora: "14:00" }),
      ...(pedido.includes("me lembra")
        ? [usar("criar_lembrete", { texto: "Revisar Cálculo", data: amanha, hora: "15:00" })]
        : []),
    ]);
  }
  if (pedido.includes("me lembra")) {
    return resposta([
      usar("criar_lembrete", {
        texto: "Revisar Cálculo",
        data: amanha,
        hora: "15:00",
        area: "aulas",
      }),
    ]);
  }
  return resposta([{ type: "text", text: "Não sei." }], "end_turn");
}

export function iniciarClaudeFalso(porta: number): Promise<Server> {
  const servidor = createServer((req, res) => {
    let corpo = "";
    req.on("data", (c) => (corpo += c));
    req.on("end", () => {
      if (req.method !== "POST" || !req.url?.startsWith("/v1/messages")) {
        res.writeHead(404).end();
        return;
      }
      const { messages } = JSON.parse(corpo) as { messages: Mensagem[] };
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(decidir(messages)));
    });
  });
  return new Promise((ok) => servidor.listen(porta, () => ok(servidor)));
}

if (process.argv[1]?.endsWith("claude-falso.ts")) {
  const porta = Number(process.env.PORTA_CLAUDE_FALSO ?? 3199);
  void iniciarClaudeFalso(porta).then(() =>
    console.log(`Claude falso em http://localhost:${porta}`),
  );
}
