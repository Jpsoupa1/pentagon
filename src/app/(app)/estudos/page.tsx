import type { Metadata } from "next";
import { ListaSessoes } from "@/components/telas/ListaSessoes";
import { SessaoHoje } from "@/components/telas/SessaoHoje";
import { BarraProgresso } from "@/components/ui/BarraProgresso";
import { Cartao, CartaoCabeca, Rotulo } from "@/components/ui/Cartao";
import { Contagem } from "@/components/ui/Contagem";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { LinhaAgenda } from "@/components/ui/LinhaAgenda";
import { CabecalhoPagina, layout } from "@/components/ui/Pagina";
import { horariosComPadrao } from "@/lib/estudos";
import {
  dataCurta,
  dataLonga,
  DIAS_CURTOS,
  diaDaSemana,
  hmParaMin,
  hojeLocal,
  horaLocal,
  minParaHm,
  paraUtc,
  partesLocais,
} from "@/lib/tempo";
import { exigirUsuario } from "@/server/sessao";
import { ocorrencias, semanaDe } from "@/server/servicos/agenda";
import { obterAjustes } from "@/server/servicos/ajustes";
import { obterTrilha, progressoPorFase, sessoesEntre } from "@/server/servicos/estudos";

export const metadata: Metadata = { title: "Estudos" };

export default async function Estudos() {
  const usuario = await exigirUsuario();
  const ajustes = await obterAjustes(usuario.id);
  const { fuso } = ajustes;
  const agora = new Date();
  const hoje = hojeLocal(agora, fuso);
  const semana = semanaDe(hoje);
  const horarios = horariosComPadrao(ajustes.horariosEstudo);
  const [trilha, daSemana, fases, agendaDaSemana] = await Promise.all([
    obterTrilha(usuario.id),
    sessoesEntre(usuario.id, semana.de, semana.ate),
    progressoPorFase(usuario.id),
    ocorrencias(usuario.id, semana),
  ]);
  // Compromissos de Estudos criados pelo usuário (fora da trilha).
  const proprios = agendaDaSemana.filter((o) => o.origem === "evento" && o.areaId === "estudos");

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

  const ligadas = daSemana.filter((x) => horarios[String(diaDaSemana(x.data))]?.ativo);
  const deHoje = ligadas.find((x) => x.data === hoje);
  const semanaAtual = deHoje ?? daSemana[0];
  const faseAtual = semanaAtual ? trilha.fases.find((f) => f.id === semanaAtual.fase) : undefined;
  const inicioDa = (x: { data: string; horaInicio: string | null }) =>
    x.horaInicio ?? horarios[String(diaDaSemana(x.data))].inicio;
  const horario = (x: { data: string; horaInicio: string | null }) => {
    const h = horarios[String(diaDaSemana(x.data))];
    return `${inicioDa(x)} – ${minParaHm(hmParaMin(inicioDa(x)) + h.minutos)}`;
  };
  // Antes da semana zero: avisa quando a trilha começa.
  const comecaEm = hoje < trilha.inicio ? dataLonga(trilha.inicio).toLowerCase() : null;
  const total = fases.reduce((t, f) => t + f.total, 0);
  const feitas = fases.reduce((t, f) => t + f.feitas, 0);

  return (
    <>
      <CabecalhoPagina
        titulo="Estudos"
        sobre={
          semanaAtual
            ? `${trilha.nome} · semana ${semanaAtual.semana} de 49${faseAtual ? ` · ${faseAtual.nome}` : ""}`
            : comecaEm
              ? `${trilha.nome} · começa ${comecaEm}`
              : trilha.nome
        }
      />
      <div className={layout.colunas}>
        <div className={layout.pilha}>
          <SessaoHoje
            agoraServidor={Math.floor(agora.getTime() / 60_000) * 60_000}
            sessao={
              deHoje
                ? {
                    id: deHoje.id,
                    rotulo: `Sessão de hoje · ${horario(deHoje)}`,
                    tipo: deHoje.tipo,
                    conteudo: deHoje.conteudo,
                    detalhe: `Tema: ${deHoje.tema}${deHoje.parte ? ` (parte ${deHoje.parte})` : ""}`,
                    minutos: horarios[String(diaDaSemana(deHoje.data))].minutos,
                    feita: deHoje.status === "feita",
                  }
                : null
            }
          />
          <Cartao aria-labelledby="sessoes-semana">
            <CartaoCabeca
              titulo={<span id="sessoes-semana">Sessões da semana</span>}
              acao={
                <span className="mono">
                  {ligadas.filter((x) => x.status === "feita").length}/{ligadas.length}
                </span>
              }
            />
            {ligadas.length ? (
              <ListaSessoes
                sessoes={ligadas.map((x) => ({
                  id: x.id,
                  rotulo: `${DIAS_CURTOS[diaDaSemana(x.data)]} ${inicioDa(x)}`,
                  texto: `${x.tipo}: ${x.conteudo}`,
                  feita: x.status === "feita",
                }))}
              />
            ) : (
              <EstadoVazio>
                {comecaEm ? `A trilha começa ${comecaEm}.` : "Nenhuma sessão nesta semana."}
              </EstadoVazio>
            )}
            {proprios.length > 0 && (
              <>
                <h3 className={layout.meta} style={{ margin: "16px 0 4px", fontWeight: 600 }}>
                  Seus estudos fora da trilha
                </h3>
                <ul className={layout.lista}>
                  {proprios.map((o) => (
                    <LinhaAgenda
                      key={o.chave}
                      hora={DIAS_CURTOS[partesLocais(o.inicio, fuso).diaSemana]}
                      area="estudos"
                      titulo={o.titulo}
                      meta={
                        o.diaInteiro
                          ? "Dia inteiro"
                          : `${horaLocal(o.inicio, fuso)} – ${horaLocal(o.fim, fuso)}${o.local ? ` · ${o.local}` : ""}`
                      }
                      passada={o.fim < agora}
                    />
                  ))}
                </ul>
              </>
            )}
          </Cartao>
        </div>
        <div className={layout.pilha}>
          <Cartao aria-labelledby="progresso">
            <CartaoCabeca
              titulo={<span id="progresso">Progresso por fase</span>}
              acao={
                <span className="mono">
                  {feitas}/{total}
                </span>
              }
            />
            <ul className={layout.lista} data-area="estudos">
              {trilha.fases.map((f) => {
                const p = fases.find((x) => x.fase === f.id) ?? { total: 0, feitas: 0 };
                return (
                  <li key={f.id} style={{ display: "grid", gap: 6, padding: "10px 0" }}>
                    <span style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ fontWeight: f.id === semanaAtual?.fase ? 650 : 500 }}>
                        {f.id === 0 ? f.nome : `Fase ${f.id}: ${f.nome}`}
                      </span>
                      <span className={`${layout.meta} mono`}>
                        {p.feitas}/{p.total}
                      </span>
                    </span>
                    <BarraProgresso
                      valor={p.total ? p.feitas / p.total : 0}
                      rotulo={`Progresso: ${f.nome}`}
                    />
                    {f.prova && <Rotulo>Fecha com {f.prova}</Rotulo>}
                  </li>
                );
              })}
            </ul>
          </Cartao>
          <Cartao aria-labelledby="certificacoes">
            <CartaoCabeca titulo={<span id="certificacoes">Certificações e marcos</span>} />
            <ul className={layout.lista}>
              {trilha.marcos.map((m) => (
                <li key={m.data} className={layout.itemLink}>
                  <span className={layout.itemTexto}>
                    <span className={layout.itemTitulo}>{m.titulo}</span>
                    <span className={`${layout.meta} mono`}>
                      {dataCurta(m.data)} {m.data.slice(0, 4)}
                    </span>
                  </span>
                  <Contagem alvo={paraUtc(m.data, "00:00", fuso)} agora={agora} fuso={fuso} />
                </li>
              ))}
            </ul>
          </Cartao>
        </div>
      </div>
    </>
  );
}
