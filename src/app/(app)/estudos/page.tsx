import type { Metadata } from "next";
import { AnotarErro } from "@/components/telas/AnotarErro";
import { ListaSessoes } from "@/components/telas/ListaSessoes";
import { RevisaoEspacada } from "@/components/telas/RevisaoEspacada";
import { RevisaoSexta } from "@/components/telas/RevisaoSexta";
import { SessaoHoje } from "@/components/telas/SessaoHoje";
import { TrilhaSeguranca } from "@/components/telas/TrilhaSeguranca";
import r from "@/components/telas/Revisao.module.css";
import { BarraProgresso } from "@/components/ui/BarraProgresso";
import { Cartao, CartaoCabeca, Rotulo } from "@/components/ui/Cartao";
import { Contagem } from "@/components/ui/Contagem";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { LinhaAgenda } from "@/components/ui/LinhaAgenda";
import { CabecalhoPagina, layout } from "@/components/ui/Pagina";
import { alvoDeEdicao } from "@/lib/alvo";
import { chaveTurno, domingoDe, horariosComPadrao } from "@/lib/estudos";
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
import { tituloDaSessao } from "@/server/estudos/trilha";
import { exigirUsuario } from "@/server/sessao";
import { ocorrencias, semanaDe } from "@/server/servicos/agenda";
import { obterAjustes } from "@/server/servicos/ajustes";
import {
  obterTrilha,
  obterTrilhaSeguranca,
  progressoPorFase,
  sessoesEntre,
} from "@/server/servicos/estudos";
import {
  errosDaSemanaAnotados,
  errosParaRevisar,
  notasDasRevisoes,
  obterRevisao,
  resumoDoCaderno,
} from "@/server/servicos/revisao";

export const metadata: Metadata = { title: "Estudos" };

export default async function Estudos() {
  const usuario = await exigirUsuario();
  const ajustes = await obterAjustes(usuario.id);
  const { fuso } = ajustes;
  const agora = new Date();
  const hoje = hojeLocal(agora, fuso);
  const semana = semanaDe(hoje);
  const domingo = diaDaSemana(hoje) === 0;
  const horarios = horariosComPadrao(ajustes.horariosEstudo);
  const [
    trilha,
    seguranca,
    daSemana,
    fases,
    agendaDaSemana,
    notas,
    caderno,
    paraRevisar,
    anotados,
  ] = await Promise.all([
    obterTrilha(usuario.id),
    obterTrilhaSeguranca(usuario.id),
    sessoesEntre(usuario.id, semana.de, semana.ate),
    progressoPorFase(usuario.id),
    ocorrencias(usuario.id, semana),
    notasDasRevisoes(usuario.id, hoje),
    resumoDoCaderno(usuario.id),
    domingo ? errosParaRevisar(usuario.id, hoje) : Promise.resolve([]),
    errosDaSemanaAnotados(usuario.id, semana.de),
  ]);
  // Sessões semanais da trilha de Segurança (compromissos ligados a ela).
  const idsSeguranca = new Set(seguranca?.sessoes.map((x) => x.id));
  const linha = (o: (typeof agendaDaSemana)[number]) => (
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
      editar={alvoDeEdicao(o)}
    />
  );
  const sessoesSeguranca = agendaDaSemana.filter(
    (o) => o.origem === "evento" && idsSeguranca.has(o.eventId),
  );
  // Compromissos de Estudos criados pelo usuário (fora das trilhas).
  const proprios = agendaDaSemana.filter(
    (o) => o.origem === "evento" && o.areaId === "estudos" && !idsSeguranca.has(o.eventId),
  );
  const noEstagio = new Set(
    agendaDaSemana.filter((o) => o.origem === "sessao" && o.noEstagio).map((o) => o.eventId),
  );

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

  const horarioDe = (x: { data: string; turno: string }) =>
    horarios[chaveTurno(diaDaSemana(x.data), x.turno)];
  const ligadas = daSemana.filter((x) => horarioDe(x)?.ativo);
  const deHoje = ligadas.filter((x) => x.data === hoje);
  // A sessão em destaque é a primeira de hoje ainda não feita (ou a última, se todas foram feitas).
  const destaque = deHoje.find((x) => x.status === "pendente") ?? deHoje.at(-1);
  const semanaAtual = destaque ?? daSemana[0];
  const faseAtual = semanaAtual ? trilha.fases.find((f) => f.id === semanaAtual.fase) : undefined;
  const inicioDa = (x: { data: string; turno: string; horaInicio: string | null }) =>
    x.horaInicio ?? horarioDe(x).inicio;
  const horario = (x: { data: string; turno: string; horaInicio: string | null }) =>
    `${inicioDa(x)} – ${minParaHm(hmParaMin(inicioDa(x)) + horarioDe(x).minutos)}`;
  // Antes da semana zero: avisa quando a trilha começa.
  const comecaEm = hoje < trilha.inicio ? dataLonga(trilha.inicio).toLowerCase() : null;
  const total = fases.reduce((t, f) => t + f.total, 0);
  const feitas = fases.reduce((t, f) => t + f.feitas, 0);

  const revisaoDaSemana = daSemana.find((x) => x.categoria === "revisao_semanal");
  const revisao = revisaoDaSemana ? await obterRevisao(usuario.id, revisaoDaSemana.weekId) : null;
  const conteudoDoDia = (data: string) =>
    daSemana.find((x) => x.data === data && x.categoria === "conteudo")?.conteudo;
  const padraoErro = {
    data: hoje,
    tema: (destaque && conteudoDoDia(destaque.data)) ?? semanaAtual?.tema ?? "",
  };
  const roteiro = (variante: "claro" | "secundario") =>
    revisaoDaSemana && (
      <RevisaoSexta
        weekId={revisaoDaSemana.weekId}
        semana={revisaoDaSemana.semana}
        inicial={revisao}
        erros={anotados.map((e) => ({ id: e.id, tema: e.tema, errei: e.errei }))}
        padraoErro={{
          data: revisaoDaSemana.data <= hoje ? hoje : revisaoDaSemana.data,
          tema: revisaoDaSemana.tema,
          origem: "revisao_semanal",
          sessaoId: revisaoDaSemana.id,
        }}
        variante={variante}
      />
    );
  const extraDoDestaque =
    destaque?.categoria === "revisao_semanal"
      ? roteiro("claro")
      : destaque?.categoria === "pratica" && (
          <AnotarErro
            padrao={{
              data: destaque.data,
              tema: conteudoDoDia(destaque.data) ?? destaque.tema,
              origem: "pratica",
              sessaoId: destaque.id,
            }}
          />
        );

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
            extra={extraDoDestaque || undefined}
            sessao={
              destaque
                ? {
                    id: destaque.id,
                    rotulo: `${deHoje.length > 1 ? `Sessão ${deHoje.indexOf(destaque) + 1} de ${deHoje.length}` : "Sessão de hoje"} · ${horario(destaque)}${noEstagio.has(destaque.id) ? " · no estágio" : ""}`,
                    titulo: tituloDaSessao(destaque),
                    detalhe: `Tema: ${destaque.tema}${destaque.parte ? ` (parte ${destaque.parte})` : ""}`,
                    minutos: horarioDe(destaque).minutos,
                    feita: destaque.status === "feita",
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
                  texto: tituloDaSessao(x),
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
                <ul className={layout.lista}>{proprios.map(linha)}</ul>
              </>
            )}
          </Cartao>
          <Cartao aria-labelledby="caderno">
            <CartaoCabeca
              titulo={<span id="caderno">{domingo ? "Revisão espaçada" : "Caderno de erros"}</span>}
              acao={<span className="mono">{caderno.abertos}</span>}
            />
            {domingo ? (
              <RevisaoEspacada
                erros={paraRevisar.map((e) => ({
                  id: e.id,
                  rotulo: `${dataCurta(e.data)} · revisar em ${dataCurta(e.revisarEm)}`,
                  tema: e.tema,
                  errei: e.errei,
                  correto: e.correto,
                }))}
              />
            ) : (
              <p className={r.vazio}>
                {caderno.abertos
                  ? `${caderno.abertos} ${caderno.abertos === 1 ? "erro" : "erros"} no caderno. A próxima revisão é no domingo, ${dataCurta(domingoDe(caderno.proxima! > hoje ? caderno.proxima! : hoje))}.`
                  : "Nenhum erro no caderno. Anote os exercícios errados na prática da tarde e na revisão de sexta."}
              </p>
            )}
            <div style={{ marginTop: 12 }}>
              <AnotarErro padrao={padraoErro} variante="secundario" />
            </div>
          </Cartao>
        </div>
        <div className={layout.pilha}>
          {revisaoDaSemana && (
            <Cartao aria-labelledby="revisao-sexta">
              <CartaoCabeca
                titulo={<span id="revisao-sexta">Revisão de sexta</span>}
                acao={
                  <span className="mono">
                    {revisao?.nota !== null && revisao?.nota !== undefined
                      ? `${revisao.nota}/10`
                      : dataCurta(revisaoDaSemana.data)}
                  </span>
                }
              />
              <div className={layout.pilha} style={{ gap: 12 }}>
                <p className={r.vazio}>
                  {revisao?.pontosFracos
                    ? `Pontos fracos: ${revisao.pontosFracos}`
                    : "Folha em branco, bateria da semana, correção, nota e pontos fracos."}
                </p>
                <div>{roteiro("secundario")}</div>
                {notas.length > 0 && (
                  <>
                    <Rotulo>Notas das últimas semanas</Rotulo>
                    <ul className={r.notas} aria-label="Notas das revisões de sexta">
                      {notas.map((n) => (
                        <li key={n.weekId}>
                          <span className={r.notaLinha}>
                            <span>
                              Semana {n.semana} · {n.tema}
                              {n.parte ? ` (${n.parte})` : ""}
                            </span>
                            <span className="mono">{n.nota}/10</span>
                          </span>
                          <BarraProgresso
                            valor={(n.nota ?? 0) / 10}
                            rotulo={`Nota da semana ${n.semana}`}
                          />
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </Cartao>
          )}
          {seguranca?.faseAtual != null && (
            <TrilhaSeguranca
              slug={seguranca.slug}
              nome={seguranca.nome}
              fases={seguranca.fases}
              faseAtual={seguranca.faseAtual}
              sessoes={sessoesSeguranca.map(linha)}
            />
          )}
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
