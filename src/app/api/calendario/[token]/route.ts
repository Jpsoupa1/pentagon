import { NextResponse } from "next/server";
import { feedPorToken } from "@/server/servicos/calendario";

/** Feed público protegido por token: GET /api/calendario/<token>.ics */
export async function GET(_req: Request, ctx: RouteContext<"/api/calendario/[token]">) {
  const { token } = await ctx.params;
  const limpo = token.replace(/\.ics$/, "");
  if (!/^[A-Za-z0-9_-]{40,64}$/.test(limpo))
    return new NextResponse("Não encontrado.", { status: 404 });
  const ics = await feedPorToken(limpo);
  if (!ics) return new NextResponse("Não encontrado.", { status: 404 });
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="pentagon.ics"',
      "Cache-Control": "private, no-cache",
    },
  });
}
