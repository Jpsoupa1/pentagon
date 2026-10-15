import "server-only";
import { redirect } from "next/navigation";
import { auth } from "./auth";

/** Para páginas: devolve o usuário da sessão ou manda para o login. */
export async function exigirUsuario() {
  const sessao = await auth();
  if (!sessao?.user?.id) redirect("/login");
  return sessao.user;
}
