import type { Metadata } from "next";
import { Cartao, CartaoCabeca } from "@/components/ui/Cartao";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { LinhaAgenda } from "@/components/ui/LinhaAgenda";
import { CabecalhoPagina, layout } from "@/components/ui/Pagina";
import { DIAS_CURTOS, duracaoTexto, hojeLocal, horaLocal, partesLocais } from "@/lib/tempo";
import { alvoDeEdicao } from "@/lib/alvo";
import { exigirUsuario } from "@/server/sessao";
import { agenda, semanaDe } from "@/server/servicos/agenda";
import { obterAjustes } from "@/server/servicos/ajustes";

export const metadata: Metadata = { title: "Estágio" };

export default async function Estagio() {
  const usuario = await exigirUsuario();
  const { fuso } = await obterAjustes(usuario.id);
  const dados = await agenda(usuario.id, semanaDe(hojeLocal(new Date(), fuso)));
  const turnos = dados.ocorrencias.filter((o) => o.areaId === "estagio");

  return (
    <>
      <CabecalhoPagina titulo="Estágio" sobre="Codevasf" />
      <div className={layout.colunas}>
        <Cartao>
          <CartaoCabeca titulo="Expediente da semana" />
          {turnos.length ? (
            <ul className={layout.lista}>
              {turnos.map((o) => (
                <LinhaAgenda
                  key={o.chave}
                  hora={DIAS_CURTOS[partesLocais(o.inicio, fuso).diaSemana]}
                  area="estagio"
                  titulo={o.titulo}
                  meta={`${horaLocal(o.inicio, fuso)} – ${horaLocal(o.fim, fuso)}${o.local ? ` · ${o.local}` : ""}`}
                  editar={alvoDeEdicao(o)}
                />
              ))}
            </ul>
          ) : (
            <EstadoVazio>
              Nenhum expediente cadastrado. Crie um compromisso na área Estágio.
            </EstadoVazio>
          )}
        </Cartao>
        <Cartao>
          <CartaoCabeca titulo="Horas na semana" />
          <p className="mono" style={{ fontSize: 32 }}>
            {duracaoTexto(dados.minutosPorArea.estagio)}
          </p>
        </Cartao>
      </div>
    </>
  );
}
