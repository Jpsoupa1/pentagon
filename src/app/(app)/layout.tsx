import { AbasFlutuantes, AbasIphone, BarraLateral, Trilho } from "@/components/shell/Navegacao";
import { AquecerCache } from "@/components/shell/AquecerCache";
import { EditarOcorrenciaProvider } from "@/components/shell/EditarOcorrencia";
import { FilaOffline } from "@/components/shell/FilaOffline";
import { NovoItemProvider } from "@/components/shell/NovoItemProvider";
import s from "@/components/shell/Shell.module.css";
import { recebeConteudoPessoal } from "@/server/permissao";
import { exigirUsuario } from "@/server/sessao";
import { obterAjustes } from "@/server/servicos/ajustes";
import { listarDisciplinas } from "@/server/servicos/disciplinas";
import { resumoNavegacao } from "@/server/servicos/navegacao";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const usuario = await exigirUsuario();
  const [{ contadores, minutosPorArea }, disciplinas, ajustes] = await Promise.all([
    resumoNavegacao(usuario.id),
    listarDisciplinas(usuario.id),
    obterAjustes(usuario.id),
  ]);
  const opcoesDisciplina = disciplinas.map(({ id, nome, sigla }) => ({ id, nome, sigla }));
  const perfil = {
    nome: usuario.name ?? usuario.email ?? "Você",
    email: usuario.email ?? "",
    imagem: usuario.image ?? null,
  };
  const dono = recebeConteudoPessoal(usuario.email);
  return (
    <NovoItemProvider disciplinas={opcoesDisciplina}>
      <EditarOcorrenciaProvider disciplinas={opcoesDisciplina} fuso={ajustes.fuso}>
        <div className={s.app}>
          <BarraLateral
            contadores={contadores}
            dono={dono}
            minutosPorArea={minutosPorArea}
            usuario={perfil}
          />
          <Trilho contadores={contadores} dono={dono} />
          <main className={s.principal} id="conteudo">
            <div className={s.conteudo}>{children}</div>
          </main>
          <AbasFlutuantes />
          <AbasIphone />
          <FilaOffline />
          <AquecerCache />
        </div>
      </EditarOcorrenciaProvider>
    </NovoItemProvider>
  );
}
