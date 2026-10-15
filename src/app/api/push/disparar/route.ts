import { Receiver } from "@upstash/qstash";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { dispararAviso } from "@/server/servicos/avisos";

/** Chamado pelo QStash no horário do aviso. Só aceita assinatura válida do QStash. */
export async function POST(req: NextRequest) {
  const atual = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const proxima = process.env.QSTASH_NEXT_SIGNING_KEY;
  const assinatura = req.headers.get("upstash-signature");
  if (!atual || !proxima || !assinatura) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }
  const texto = await req.text();
  try {
    const receiver = new Receiver({ currentSigningKey: atual, nextSigningKey: proxima });
    const valida = await receiver.verify({
      signature: assinatura,
      body: texto,
      upstashRegion: req.headers.get("upstash-region") ?? undefined,
    });
    if (!valida) throw new Error("assinatura inválida");
  } catch {
    return NextResponse.json({ erro: "Assinatura inválida." }, { status: 401 });
  }
  const parsed = z.object({ id: z.uuid() }).safeParse(JSON.parse(texto || "{}"));
  if (!parsed.success) return NextResponse.json({ erro: "Corpo inválido." }, { status: 400 });
  return NextResponse.json(await dispararAviso(parsed.data.id));
}
