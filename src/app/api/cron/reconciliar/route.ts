import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { reconciliarTodos } from "@/server/servicos/avisos";

export const maxDuration = 60;

function autorizado(req: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  const recebido = req.headers.get("authorization") ?? "";
  if (!segredo) return false;
  const esperado = Buffer.from(`Bearer ${segredo}`);
  const atual = Buffer.from(recebido);
  return esperado.length === atual.length && timingSafeEqual(esperado, atual);
}

/**
 * Cron diário (03:00 em São Paulo): agenda no QStash os avisos das próximas 48 h
 * que faltarem e marca como falhos os que ficaram órfãos.
 */
export async function GET(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  return NextResponse.json({ ok: true, ...(await reconciliarTodos()) });
}
