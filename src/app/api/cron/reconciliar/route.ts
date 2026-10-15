import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";

function autorizado(req: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  const recebido = req.headers.get("authorization") ?? "";
  if (!segredo) return false;
  const esperado = Buffer.from(`Bearer ${segredo}`);
  const atual = Buffer.from(recebido);
  return esperado.length === atual.length && timingSafeEqual(esperado, atual);
}

/**
 * Cron diário (03:00 em São Paulo). Na etapa 2 passa a agendar no QStash os avisos
 * das próximas 48 h que faltarem e a limpar os órfãos. Por enquanto só confere o segredo.
 */
export async function GET(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  return NextResponse.json({ ok: true, agendados: 0, removidos: 0 });
}
