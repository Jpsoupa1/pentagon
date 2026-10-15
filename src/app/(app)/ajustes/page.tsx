import type { Metadata } from "next";
import { headers } from "next/headers";
import { Icone } from "@/components/shell/icones";
import { AtivarAvisos } from "@/components/telas/AtivarAvisos";
import { FeedCalendario } from "@/components/telas/FeedCalendario";
import { FormAjustes } from "@/components/telas/FormAjustes";
import { HorariosEstudo } from "@/components/telas/HorariosEstudo";
import { Botao } from "@/components/ui/Botao";
import { Cartao, CartaoCabeca } from "@/components/ui/Cartao";
import uiS from "@/components/ui/ui.module.css";
import { CabecalhoPagina, layout } from "@/components/ui/Pagina";
import { signOut } from "@/server/auth";
import { exigirUsuario } from "@/server/sessao";
import { horariosComPadrao } from "@/lib/estudos";
import { chavePublicaVapid } from "@/server/avisos/push";
import { obterAjustes } from "@/server/servicos/ajustes";
import { tokenAtivo } from "@/server/servicos/calendario";

export const metadata: Metadata = { title: "Ajustes" };

export default async function Ajustes() {
  const usuario = await exigirUsuario();
  const [ajustes, token, cabecalhos] = await Promise.all([
    obterAjustes(usuario.id),
    tokenAtivo(usuario.id),
    headers(),
  ]);
  const host = cabecalhos.get("x-forwarded-host") ?? cabecalhos.get("host") ?? "localhost:3000";

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
        <Cartao>
          <CartaoCabeca titulo="Horários de estudo" />
          <HorariosEstudo inicial={horariosComPadrao(ajustes.horariosEstudo)} />
        </Cartao>
        <Cartao>
          <CartaoCabeca titulo="Avisos" />
          <AtivarAvisos chavePublica={chavePublicaVapid()} />
        </Cartao>
        <Cartao>
          <CartaoCabeca titulo="Calendário do iPhone" />
          <FeedCalendario token={token?.token ?? null} host={host} />
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
