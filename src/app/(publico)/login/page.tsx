import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { auth, signIn } from "@/server/auth";
import s from "./login.module.css";

export const metadata: Metadata = { title: "Entrar" };

const ERROS: Record<string, string> = {
  AccessDenied: "Este email não tem acesso ao Pentagon.",
  Configuration: "O login não está configurado. Confira as variáveis AUTH_* na Vercel.",
};

function destinoSeguro(v: string | undefined) {
  return v && v.startsWith("/") && !v.startsWith("//") ? v : "/";
}

export default async function Login({ searchParams }: PageProps<"/login">) {
  const { error, voltar } = await searchParams;
  const destino = destinoSeguro(typeof voltar === "string" ? voltar : undefined);
  const sessao = await auth();
  if (sessao?.user) redirect(destino);
  const erro =
    typeof error === "string" ? (ERROS[error] ?? "Não foi possível entrar. Tente de novo.") : null;

  return (
    <main className={s.pagina}>
      <div className={s.cartao}>
        <Logo tamanho={56} />
        <h1 className={s.titulo}>Pentagon</h1>
        <p className={s.texto}>Aulas, provas, estudos, estágio e rotina pessoal num lugar só.</p>
        {erro && (
          <p className={s.erro} role="alert">
            {erro}
          </p>
        )}
        <form
          action={async () => {
            "use server";
            await signIn("github", { redirectTo: destino });
          }}
        >
          <button type="submit" className={s.botao}>
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden fill="currentColor">
              <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.77.11 3.06.74.81 1.19 1.84 1.19 3.1 0 4.43-2.7 5.41-5.26 5.69.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
            </svg>
            Entrar com GitHub
          </button>
        </form>
      </div>
    </main>
  );
}
