import type { Metadata } from "next";
import { BarraProgresso } from "@/components/ui/BarraProgresso";
import { Cartao, CartaoCabeca, Rotulo } from "@/components/ui/Cartao";
import { Contagem } from "@/components/ui/Contagem";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { LinhaAgenda } from "@/components/ui/LinhaAgenda";
import { CabecalhoPagina, layout } from "@/components/ui/Pagina";
import { DIAS_CURTOS, diaDaSemana, hojeLocal, paraUtc } from "@/lib/tempo";
import { exigirUsuario } from "@/server/sessao";
import { semanaDe } from "@/server/servicos/agenda";
import { obterAjustes } from "@/server/servicos/ajustes";
import { listarTrilhas, sessoesEntre } from "@/server/servicos/estudos";

export const metadata: Metadata = { title: "Estudos" };

export default async function Estudos() {
  const usuario = await exigirUsuario();
  const { fuso } = await obterAjustes(usuario.id);
  const hoje = hojeLocal(new Date(), fuso);
  const semana = semanaDe(hoje);
  const [trilhas, sessoes] = await Promise.all([
    listarTrilhas(usuario.id),
    sessoesEntre(usuario.id, semana.de, semana.ate),
  ]);
  const trilha = trilhas[0];

  if (!trilha) {
    return (
      <>
        <CabecalhoPagina titulo="Estudos" />
        <Cartao>
          <EstadoVazio centro>Nenhuma trilha de estudos cadastrada.</EstadoVazio>
        </Cartao>
      </>
    );
  }

  const deHoje = sessoes.find((x) => x.data === hoje);
  const certificacoes = trilha.marcos.filter((m) => m.prova);

  return (
    <>
      <CabecalhoPagina titulo="Estudos" sobre={trilha.nome} />
      <div className={layout.colunas}>
        <div className={layout.pilha}>
          <section
            data-area="estudos"
            style={{
              background: "var(--estudos)",
              color: "#fff",
              borderRadius: "var(--r-lg)",
              padding: 22,
              display: "grid",
              gap: 8,
            }}
            aria-labelledby="sessao-hoje"
          >
            <span
              className="mono"
              style={{
                fontSize: 11,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                opacity: 0.85,
              }}
            >
              Sessão de hoje
            </span>
            <h2 id="sessao-hoje" style={{ fontSize: 22, fontWeight: 650 }}>
              {deHoje ? `${deHoje.tipo}: ${deHoje.conteudo}` : "Sem sessão hoje."}
            </h2>
          </section>
          <Cartao>
            <CartaoCabeca titulo="Sessões da semana" />
            {sessoes.length ? (
              <ul className={layout.lista}>
                {sessoes.map((x) => (
                  <LinhaAgenda
                    key={x.id}
                    hora={DIAS_CURTOS[diaDaSemana(x.data)]}
                    area="estudos"
                    titulo={`${x.tipo}: ${x.conteudo}`}
                    fim={
                      x.status === "feita" ? <span className={layout.meta}>feita</span> : undefined
                    }
                  />
                ))}
              </ul>
            ) : (
              <EstadoVazio>Nenhuma sessão nesta semana.</EstadoVazio>
            )}
          </Cartao>
        </div>
        <div className={layout.pilha}>
          <Cartao>
            <CartaoCabeca
              titulo="Progresso"
              acao={
                <span className="mono">
                  {trilha.feitas}/{trilha.total}
                </span>
              }
            />
            <div data-area="estudos">
              <BarraProgresso
                valor={trilha.total ? trilha.feitas / trilha.total : 0}
                rotulo="Progresso da trilha"
              />
            </div>
          </Cartao>
          <Cartao>
            <CartaoCabeca titulo="Certificações" />
            {certificacoes.length ? (
              <ul className={layout.lista}>
                {certificacoes.map((m) => (
                  <li key={m.data} className={layout.itemLink}>
                    <span className={layout.itemTexto}>
                      <span className={layout.itemTitulo}>{m.titulo}</span>
                      <Rotulo>Fase {m.fase}</Rotulo>
                    </span>
                    <Contagem alvo={paraUtc(m.data, "09:00", fuso)} fuso={fuso} />
                  </li>
                ))}
              </ul>
            ) : (
              <EstadoVazio>Nenhuma certificação marcada.</EstadoVazio>
            )}
          </Cartao>
        </div>
      </div>
    </>
  );
}
