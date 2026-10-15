import { AbasFlutuantes, AbasIphone, BarraLateral, Trilho } from "@/components/shell/Navegacao";
import { FilaOffline } from "@/components/shell/FilaOffline";
import { NovoItemProvider } from "@/components/shell/NovoItemProvider";
import s from "@/components/shell/Shell.module.css";
import { exigirUsuario } from "@/server/sessao";
import { listarDisciplinas } from "@/server/servicos/disciplinas";
import { resumoNavegacao } from "@/server/servicos/navegacao";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const usuario = await exigirUsuario();
  const [{ contadores, minutosPorArea }, disciplinas] = await Promise.all([
    resumoNavegacao(usuario.id),
    listarDisciplinas(usuario.id),
  ]);
  const perfil = {
    nome: usuario.name ?? usuario.email ?? "Você",
    email: usuario.email ?? "",
    imagem: usuario.image ?? null,
  };
  return (
    <NovoItemProvider disciplinas={disciplinas.map(({ id, nome, sigla }) => ({ id, nome, sigla }))}>
      <div className={s.app}>
        <BarraLateral contadores={contadores} minutosPorArea={minutosPorArea} usuario={perfil} />
        <Trilho contadores={contadores} />
        <main className={s.principal} id="conteudo">
          <div className={s.conteudo}>{children}</div>
        </main>
        <AbasFlutuantes />
        <AbasIphone />
        <FilaOffline />
      </div>
    </NovoItemProvider>
  );
}
