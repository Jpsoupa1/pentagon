import { NextResponse } from "next/server";
import { hojeLocal } from "@/lib/tempo";
import { rota } from "@/server/api";
import { exportarTudo } from "@/server/servicos/exportar";

export const GET = rota(async ({ userId }) => {
  const dados = await exportarTudo(userId);
  return new NextResponse(JSON.stringify(dados, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="pentagon-${hojeLocal()}.json"`,
      "Cache-Control": "no-store",
    },
  });
});
