import type { Metadata } from "next";
import { Icone } from "@/components/shell/icones";
import { FormAjustes } from "@/components/telas/FormAjustes";
import { Botao } from "@/components/ui/Botao";
import { Cartao, CartaoCabeca } from "@/components/ui/Cartao";
import uiS from "@/components/ui/ui.module.css";
import { CabecalhoPagina, layout } from "@/components/ui/Pagina";
import { signOut } from "@/server/auth";
import { exigirUsuario } from "@/server/sessao";
import { obterAjustes } from "@/server/servicos/ajustes";

export const metadata: Metadata = { title: "Ajustes" };

export default async function Ajustes() {
  const usuario = await exigirUsuario();
  const ajustes = await obterAjustes(usuario.id);

  return (
    <>
      <CabecalhoPagina titulo="Ajustes" sobre={usuario.email ?? undefined} />
      <div className={layout.duas}>
        <Cartao>
          <CartaoCabeca titulo="Rotina" />
          <FormAjustes
            inicial={{
              avisoMin: ajustes.avisoMin,
              periodoInicio: ajustes.periodoInicio,
              periodoFim: ajustes.periodoFim,
            }}
          />
        </Cartao>
        <div className={layout.pilha}>
          <Cartao>
            <CartaoCabeca titulo="Seus dados" />
            <p className={layout.meta} style={{ marginBottom: 14 }}>
              Baixe tudo o que está no Pentagon (agenda, disciplinas, provas, estudos e lembretes)
              num arquivo JSON.
            </p>
            <a href="/api/exportar" download className={uiS.botao + " " + uiS.secundario}>
              Exportar dados em JSON
            </a>
          </Cartao>
          <Cartao>
            <CartaoCabeca titulo="Conta" />
            <p className={layout.meta} style={{ marginBottom: 14 }}>
              Conectado como {usuario.name ?? usuario.email} pelo GitHub.
            </p>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <Botao type="submit" variante="secundario">
                <Icone nome="sair" tamanho={18} /> Sair
              </Botao>
            </form>
          </Cartao>
        </div>
      </div>
    </>
  );
}
