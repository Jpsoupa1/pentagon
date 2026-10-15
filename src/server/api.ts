import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { auth } from "./auth";
import { Conflito, NaoEncontrado } from "./erros";

type Contexto<P> = { userId: string; req: NextRequest; params: P };

/**
 * Envolve um Route Handler: exige sessão, trata erros de validação e de negócio
 * e serializa a resposta em JSON. Toda rota de dados passa por aqui.
 */
export function rota<P = Record<string, never>>(
  fn: (ctx: Contexto<P>) => Promise<unknown>,
  opcoes: { status?: number } = {},
) {
  return async (req: NextRequest, ctx: { params: Promise<P> }) => {
    const sessao = await auth();
    if (!sessao?.user?.id) {
      return NextResponse.json({ erro: "Faça login para continuar." }, { status: 401 });
    }
    try {
      const resultado = await fn({ userId: sessao.user.id, req, params: await ctx.params });
      if (resultado instanceof Response) return resultado;
      if (resultado === undefined) return new NextResponse(null, { status: 204 });
      return NextResponse.json(resultado, { status: opcoes.status ?? 200 });
    } catch (erro) {
      return respostaDeErro(erro);
    }
  };
}

export function respostaDeErro(erro: unknown) {
  if (erro instanceof ZodError) {
    return NextResponse.json(
      { erro: "Dados inválidos.", campos: z.flattenError(erro).fieldErrors },
      { status: 400 },
    );
  }
  if (erro instanceof NaoEncontrado)
    return NextResponse.json({ erro: erro.message }, { status: 404 });
  if (erro instanceof Conflito) {
    return NextResponse.json({ erro: erro.message, detalhes: erro.detalhes }, { status: 409 });
  }
  if (erro instanceof SyntaxError)
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  console.error(erro);
  return NextResponse.json({ erro: "Erro interno. Tente de novo." }, { status: 500 });
}

export async function corpo<T extends z.ZodType>(
  req: NextRequest,
  schema: T,
): Promise<z.output<T>> {
  return schema.parse(await req.json());
}

export const idSchema = z.uuid({ message: "Identificador inválido" });
