import { NextResponse, type NextRequest } from "next/server";

/**
 * Checagem otimista: sem cookie de sessão, páginas vão para o login e a API responde 401.
 * A validação de verdade (sessão no banco) acontece em cada página e rota, via auth().
 */
const COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"];

export function proxy(req: NextRequest) {
  const temSessao = COOKIES.some((c) => req.cookies.has(c));
  if (temSessao) return NextResponse.next();
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ erro: "Faça login para continuar." }, { status: 401 });
  }
  const login = new URL("/login", req.url);
  if (req.nextUrl.pathname !== "/") login.searchParams.set("voltar", req.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    // Públicos: login, Auth.js, disparo do QStash (assinatura), cron (CRON_SECRET),
    // feed .ics (token), service worker, manifest, ícones e arquivos do Next.
    "/((?!login|api/auth|api/push/disparar|api/cron|api/calendario|serwist|manifest.webmanifest|icons|~offline|_next/static|_next/image|favicon.ico).*)",
  ],
};
