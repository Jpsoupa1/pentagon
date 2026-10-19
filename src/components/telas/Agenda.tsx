"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMidia, useRelogio } from "@/lib/cliente/hooks";
import { AREAS } from "@/lib/areas";
import { TIPO_AVALIACAO_NOME, type AreaId, type TipoAvaliacao } from "@/lib/dominio";
import { addDias, DIAS_CURTOS, hojeLocal, partesLocais } from "@/lib/tempo";
import { ControleSegmentado } from "../ui/ControleSegmentado";
import { EstadoVazio } from "../ui/EstadoVazio";
import { useEditarOcorrencia } from "../shell/EditarOcorrencia";
import { useNovoItem } from "../shell/NovoItemProvider";
import s from "./Agenda.module.css";

export type OcorrenciaAgenda = {
  chave: string;
  origem: "evento" | "sessao" | "marco" | "feriado";
  eventId: string;
  dataOriginal: string;
  recorrente: boolean;
  titulo: string;
  areaId: AreaId;
  local: string | null;
  inicio: string;
  fim: string;
  diaInteiro: boolean;
  movida: boolean;
  /** Sessão de estudo que acontece durante o estágio, de propósito. */
  noEstagio?: boolean;
};
export type PrazoAgenda = {
  id: string;
  tipo: TipoAvaliacao;
  titulo: string;
  sigla: string | null;
  entregaEm: string;
};

const HORA_INICIO = 7;
const HORA_FIM = 23;
const PX_HORA = 48;

type Bloco = OcorrenciaAgenda & {
  data: string;
  ini: number;
  fimMin: number;
  faixa: number;
  faixas: number;
};

/** Distribui blocos sobrepostos em faixas lado a lado. */
function emFaixas(lista: Omit<Bloco, "faixa" | "faixas">[]): Bloco[] {
  const ordenados = [...lista].sort((a, b) => a.ini - b.ini || b.fimMin - a.fimMin);
  const saida: Bloco[] = [];
  let grupo: Bloco[] = [];
  let fimGrupo = -1;
  const fechar = () => {
    const n = Math.max(1, ...grupo.map((b) => b.faixa + 1));
    grupo.forEach((b) => (b.faixas = n));
    saida.push(...grupo);
    grupo = [];
  };
  for (const b of ordenados) {
    if (b.ini >= fimGrupo && grupo.length) fechar();
    const ocupadas = grupo.filter((g) => g.fimMin > b.ini).map((g) => g.faixa);
    let faixa = 0;
    while (ocupadas.includes(faixa)) faixa++;
    grupo.push({ ...b, faixa, faixas: 1 });
    fimGrupo = Math.max(fimGrupo, b.fimMin);
  }
  if (grupo.length) fechar();
  return saida;
}

function hm(min: number) {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

export function Agenda({
  de,
  ocorrencias,
  prazos,
  fuso,
}: {
  de: string;
  ocorrencias: OcorrenciaAgenda[];
  prazos: PrazoAgenda[];
  fuso: string;
}) {
  const { abrir } = useNovoItem();
  const { abrir: abrirEdicao } = useEditarOcorrencia();
  const editar = (o: OcorrenciaAgenda) =>
    o.origem === "evento"
      ? () =>
          abrirEdicao({
            eventId: o.eventId,
            dataOriginal: o.dataOriginal,
            titulo: o.titulo,
            areaId: o.areaId,
            inicio: o.inicio,
            fim: o.fim,
            movida: o.movida,
            recorrente: o.recorrente,
          })
      : undefined;
  const ehIphone = useMidia("(max-width: 767px)");
  const agora = useRelogio();
  const [visaoEscolhida, setVisao] = useState<"semana" | "dia" | null>(null);
  const [filtro, setFiltro] = useState<AreaId | "todas">("todas");
  const [diaEscolhido, setDia] = useState<string | null>(null);
  const hoje = agora ? hojeLocal(new Date(agora), fuso) : null;
  const dias = useMemo(() => Array.from({ length: 7 }, (_, i) => addDias(de, i)), [de]);
  // No iPhone a visão Dia é a padrão.
  const visao = visaoEscolhida ?? (ehIphone ? "dia" : "semana");
  const dia =
    diaEscolhido && dias.includes(diaEscolhido)
      ? diaEscolhido
      : hoje && dias.includes(hoje)
        ? hoje
        : dias[0];

  const visiveis = useMemo(
    () => ocorrencias.filter((o) => filtro === "todas" || o.areaId === filtro),
    [ocorrencias, filtro],
  );
  const prazosVisiveis = useMemo(
    () => (filtro === "todas" || filtro === "provas" ? prazos : []),
    [prazos, filtro],
  );

  const porDia = useMemo(() => {
    const mapa = new Map<
      string,
      { blocos: Bloco[]; inteiros: OcorrenciaAgenda[]; prazos: PrazoAgenda[] }
    >();
    for (const d of dias) mapa.set(d, { blocos: [], inteiros: [], prazos: [] });
    const brutos = new Map<string, Omit<Bloco, "faixa" | "faixas">[]>();
    for (const o of visiveis) {
      const ini = partesLocais(new Date(o.inicio), fuso);
      if (o.diaInteiro) {
        mapa.get(ini.data)?.inteiros.push(o);
        continue;
      }
      const fim = partesLocais(new Date(o.fim), fuso);
      const fimMin = fim.data === ini.data ? fim.minutos : 24 * 60;
      const lista = brutos.get(ini.data) ?? [];
      lista.push({ ...o, data: ini.data, ini: ini.minutos, fimMin });
      brutos.set(ini.data, lista);
    }
    for (const [d, lista] of brutos) {
      const alvo = mapa.get(d);
      if (alvo) alvo.blocos = emFaixas(lista);
    }
    for (const p of prazosVisiveis)
      mapa.get(partesLocais(new Date(p.entregaEm), fuso).data)?.prazos.push(p);
    return mapa;
  }, [visiveis, prazosVisiveis, dias, fuso]);

  const horas = Array.from({ length: HORA_FIM - HORA_INICIO }, (_, i) => HORA_INICIO + i);
  const agoraLocal = agora ? partesLocais(new Date(agora), fuso) : null;
  const linhaAgora =
    agoraLocal && agoraLocal.minutos >= HORA_INICIO * 60 && agoraLocal.minutos <= HORA_FIM * 60
      ? ((agoraLocal.minutos - HORA_INICIO * 60) / 60) * PX_HORA
      : null;
  const vazio = !visiveis.length && !prazosVisiveis.length;

  const navegar = (
    <div className={s.nav}>
      <Link
        className={s.navBotao}
        href={`/agenda?semana=${addDias(de, -7)}`}
        aria-label="Semana anterior"
      >
        ‹
      </Link>
      <Link className={s.navHoje} href="/agenda">
        Hoje
      </Link>
      <Link
        className={s.navBotao}
        href={`/agenda?semana=${addDias(de, 7)}`}
        aria-label="Próxima semana"
      >
        ›
      </Link>
    </div>
  );

  return (
    <div className={s.agenda}>
      <div className={s.barra}>
        <ControleSegmentado
          rotulo="Visão"
          valor={visao}
          aoMudar={setVisao}
          opcoes={[
            { valor: "semana", rotulo: "Semana" },
            { valor: "dia", rotulo: "Dia" },
          ]}
        />
        {navegar}
        <label className={s.filtro}>
          <span className="sr-only">Filtrar por área</span>
          <select value={filtro} onChange={(e) => setFiltro(e.target.value as AreaId | "todas")}>
            <option value="todas">Todas as áreas</option>
            {AREAS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </select>
        </label>
      </div>

      {vazio && (
        <div className={s.vazio}>
          <EstadoVazio
            acao={
              <button className={s.linkBotao} onClick={() => abrir()}>
                Adicionar compromisso
              </button>
            }
          >
            {filtro === "todas"
              ? "Nenhum compromisso nesta semana."
              : "Nada desta área nesta semana."}
          </EstadoVazio>
        </div>
      )}

      {visao === "semana" ? (
        <div className={s.semana} role="grid" aria-label="Semana">
          <div className={s.cabecaSemana} role="row">
            <span role="columnheader" aria-label="Hora" />
            {dias.map((d, i) => (
              <span
                key={d}
                role="columnheader"
                className={s.cabecaDia}
                data-hoje={d === hoje || undefined}
              >
                <span className={s.diaNome}>{DIAS_CURTOS[(i + 1) % 7]}</span>
                <span className={`${s.diaNum} mono`}>{Number(d.slice(8))}</span>
              </span>
            ))}
          </div>
          <div className={s.faixaInteira} role="row">
            <span className={`${s.faixaRotulo} mono`} role="rowheader">
              dia
            </span>
            {dias.map((d) => {
              const x = porDia.get(d)!;
              return (
                <div key={d} className={s.faixaDia} role="gridcell">
                  {x.inteiros.map((o) => (
                    <span key={o.chave} className={s.pilula} data-area={o.areaId} title={o.titulo}>
                      {o.titulo}
                    </span>
                  ))}
                  {x.prazos.map((p) => (
                    <Link
                      key={p.id}
                      href={`/provas?item=${p.id}`}
                      className={s.pilula}
                      data-area="provas"
                      title={p.titulo}
                    >
                      {p.sigla ? `${p.sigla} · ` : ""}
                      {p.titulo}
                    </Link>
                  ))}
                </div>
              );
            })}
          </div>
          <div className={s.grade} style={{ height: horas.length * PX_HORA }}>
            <div className={s.horas} aria-hidden>
              {horas.map((h) => (
                <span key={h} className="mono" style={{ top: (h - HORA_INICIO) * PX_HORA }}>
                  {String(h).padStart(2, "0")}:00
                </span>
              ))}
            </div>
            {dias.map((d) => (
              <div key={d} className={s.coluna} role="gridcell" aria-label={d}>
                {horas.map((h) => (
                  <span
                    key={h}
                    className={s.linhaHora}
                    style={{ top: (h - HORA_INICIO) * PX_HORA }}
                  />
                ))}
                {porDia.get(d)!.blocos.map((b) => {
                  const topo = Math.max(0, ((b.ini - HORA_INICIO * 60) / 60) * PX_HORA);
                  const fundo = Math.min(
                    horas.length * PX_HORA,
                    ((b.fimMin - HORA_INICIO * 60) / 60) * PX_HORA,
                  );
                  if (fundo <= 0 || topo >= horas.length * PX_HORA) return null;
                  const aoTocar = editar(b);
                  const Tag = aoTocar ? "button" : "div";
                  return (
                    <Tag
                      key={b.chave}
                      type={aoTocar ? "button" : undefined}
                      onClick={aoTocar}
                      className={s.bloco}
                      data-area={b.areaId}
                      style={{
                        top: topo,
                        height: Math.max(22, fundo - topo - 2),
                        left: `calc(${(b.faixa / b.faixas) * 100}% + 2px)`,
                        width: `calc(${100 / b.faixas}% - 4px)`,
                      }}
                    >
                      <span className={s.blocoTitulo}>{b.titulo}</span>
                      <span className={`${s.blocoHora} mono`}>
                        {hm(b.ini)}–{hm(b.fimMin % 1440)}
                      </span>
                      {b.noEstagio && <span className={s.selo}>no estágio</span>}
                    </Tag>
                  );
                })}
                {d === hoje && linhaAgora !== null && (
                  <span className={s.agora} style={{ top: linhaAgora }} aria-label="Agora" />
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className={s.diaVisao}>
          <div className={s.faixaDias} role="tablist" aria-label="Dias da semana">
            {dias.map((d, i) => {
              const x = porDia.get(d)!;
              const areas = [...new Set([...x.blocos, ...x.inteiros].map((o) => o.areaId))];
              if (x.prazos.length && !areas.includes("provas")) areas.push("provas");
              return (
                <button
                  key={d}
                  type="button"
                  role="tab"
                  aria-selected={d === dia}
                  className={s.botaoDia}
                  data-hoje={d === hoje || undefined}
                  onClick={() => setDia(d)}
                >
                  <span className={s.diaNome}>{DIAS_CURTOS[(i + 1) % 7]}</span>
                  <span className={`${s.diaNum} mono`}>{Number(d.slice(8))}</span>
                  <span className={s.pontos} aria-hidden>
                    {areas.slice(0, 4).map((a) => (
                      <span key={a} data-area={a} />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
          <LinhaDoTempo
            editar={editar}
            itens={porDia.get(dia)!}
            fuso={fuso}
            agora={dia === hoje ? agoraLocal?.minutos : undefined}
          />
        </div>
      )}
    </div>
  );
}

function LinhaDoTempo({
  editar,
  itens,
  fuso,
  agora,
}: {
  editar: (o: OcorrenciaAgenda) => (() => void) | undefined;
  itens: { blocos: Bloco[]; inteiros: OcorrenciaAgenda[]; prazos: PrazoAgenda[] };
  fuso: string;
  agora?: number;
}) {
  const blocos = [...itens.blocos].sort((a, b) => a.ini - b.ini);
  if (!blocos.length && !itens.inteiros.length && !itens.prazos.length) {
    return <EstadoVazio>Dia livre.</EstadoVazio>;
  }
  return (
    <ol className={s.tempo}>
      {itens.inteiros.map((o) => (
        <li key={o.chave} className={s.tempoItem} data-area={o.areaId}>
          <span className={`${s.tempoHora} mono`}>dia</span>
          <span className={s.tempoCartao}>
            <strong>{o.titulo}</strong>
            <span>Dia inteiro</span>
          </span>
        </li>
      ))}
      {itens.prazos.map((p) => (
        <li key={p.id} className={s.tempoItem} data-area="provas">
          <span className={`${s.tempoHora} mono`}>
            {partesLocais(new Date(p.entregaEm), fuso).hora}
          </span>
          <Link href={`/provas?item=${p.id}`} className={s.tempoCartao}>
            <strong>{p.titulo}</strong>
            <span>
              {TIPO_AVALIACAO_NOME[p.tipo]}
              {p.sigla ? ` · ${p.sigla}` : ""}
            </span>
          </Link>
        </li>
      ))}
      {blocos.map((b) => {
        const aoTocar = editar(b);
        const Tag = aoTocar ? "button" : "span";
        return (
          <li
            key={b.chave}
            className={s.tempoItem}
            data-area={b.areaId}
            data-passado={agora !== undefined && b.fimMin <= agora ? true : undefined}
          >
            <span className={`${s.tempoHora} mono`}>{hm(b.ini)}</span>
            <Tag type={aoTocar ? "button" : undefined} onClick={aoTocar} className={s.tempoCartao}>
              <strong>{b.titulo}</strong>
              <span className="mono">
                {hm(b.ini)} – {hm(b.fimMin % 1440)}
                {b.local ? ` · ${b.local}` : ""}
                {b.movida ? " · mudado neste dia" : ""}
              </span>
              {b.noEstagio && <span className={s.selo}>no estágio</span>}
            </Tag>
          </li>
        );
      })}
    </ol>
  );
}
