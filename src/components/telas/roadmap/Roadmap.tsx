"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { enviar } from "@/lib/cliente/api";
import { pausaEm, percentual, separarNumero } from "@/lib/roadmap";
import type { FaseRoadmap, RoadmapDados } from "@/server/servicos/roadmap";
import { coresDaFase, feitosDe, type Aba } from "./comum";
import { Mapa, Pausas, Pilulas } from "./Mapa";
import { Portao } from "./Portao";
import { ProximoPortao } from "./ProximoPortao";
import { Recursos } from "./Recursos";
import s from "./Roadmap.module.css";
import { TrocarTrilha } from "./TrocarTrilha";

/**
 * Roadmap de uma trilha: mapa das fases, o portão da fase selecionada e os recursos.
 * Marcar requisito e somar prática atualizam a tela na hora e voltam atrás se o servidor recusar.
 */
export function Roadmap({ inicial, abaInicial }: { inicial: RoadmapDados; abaInicial: Aba }) {
  const { trilha, trilhas, pausas, hoje, atual, inicio } = inicial;
  const [fases, setFases] = useState(inicial.fases);
  const [aba, setAba] = useState(abaInicial);
  const [selecionada, setSelecionada] = useState(Math.max(0, atual));
  const [aviso, setAviso] = useState<string | null>(null);
  const detalhe = useRef<HTMLDivElement>(null);
  const base = `/api/trilhas/${trilha.slug}/roadmap`;

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 5000);
    return () => clearTimeout(t);
  }, [aviso]);

  function mudarFase(i: number, mudar: (f: FaseRoadmap) => FaseRoadmap) {
    setFases((fs) => fs.map((f, j) => (j === i ? mudar(f) : f)));
  }

  function marcar(i: number, id: string, feito: boolean) {
    mudarFase(i, (f) => ({
      ...f,
      requisitos: f.requisitos.map((r) => (r.id === id ? { ...r, feito } : r)),
    }));
  }

  async function alternarRequisito(i: number, id: string) {
    const req = fases[i].requisitos.find((r) => r.id === id)!;
    const feito = !req.feito;
    marcar(i, id, feito);
    const r = await enviar("PATCH", `${base}/requisitos/${id}`, { feito });
    if (!r.ok) {
      marcar(i, id, !feito);
      setAviso(`Não deu para ${feito ? "marcar" : "desmarcar"} "${req.rotulo}". ${r.erro}`);
    }
  }

  function somar(i: number, id: string, delta: 1 | -1) {
    mudarFase(i, (f) => ({
      ...f,
      pratica: f.pratica.map((p) =>
        p.id === id ? { ...p, manual: Math.max(0, p.manual + delta) } : p,
      ),
    }));
  }

  async function registrarPratica(i: number, id: string, delta: 1 | -1) {
    const p = fases[i].pratica.find((x) => x.id === id)!;
    if (delta === -1 && p.manual === 0) return;
    somar(i, id, delta);
    const r = await enviar<{ manual: number }>("POST", `${base}/pratica/${id}`, { delta });
    if (!r.ok) {
      somar(i, id, delta === 1 ? -1 : 1);
      setAviso(`Não deu para registrar "${p.titulo}". ${r.erro}`);
    }
  }

  /** A aba fica no endereço: trocar de trilha (ou recarregar) volta para ela. */
  function trocarAba(a: Aba) {
    setAba(a);
    window.history.replaceState(null, "", `?aba=${a}`);
  }

  function verOQueFalta() {
    setSelecionada(Math.max(0, atual));
    detalhe.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    detalhe.current?.focus({ preventScroll: true });
  }

  const total = fases.reduce((t, f) => t + f.requisitos.length, 0);
  const feitos = fases.reduce((t, f) => t + feitosDe(f), 0);
  const pausa = pausaEm(pausas, hoje);
  const faseAtual = fases[Math.max(0, atual)];
  const fase = fases[selecionada];

  return (
    <div className={s.roadmap}>
      <div className={s.topo}>
        <header className={s.cabecalho}>
          <nav aria-label="Caminho" className={s.caminho}>
            <ol>
              <li>
                <Link href="/trilhas">Trilhas</Link>
              </li>
              <li>
                <Link href="/estudos">{trilha.nome.replace(/^Trilha /, "")}</Link>
              </li>
              <li aria-current="page">Roadmap</li>
            </ol>
          </nav>
          {trilhas.length > 1 && <TrocarTrilha trilhas={trilhas} atual={trilha.slug} aba={aba} />}
          <h1 className={s.titulo}>
            <span className={s.tituloLongo}>{trilha.titulo}</span>
            <span className={s.tituloCurto}>Roadmap</span>
          </h1>
          {trilha.subtitulo && <p className={s.subtitulo}>{trilha.subtitulo}</p>}
          <p className={s.sobre}>{trilha.sobre}</p>
          <dl className={s.numeros}>
            {trilha.numeros.map((texto) => {
              const { numero, rotulo } = separarNumero(texto);
              return (
                <div key={texto}>
                  <dt>{rotulo}</dt>
                  <dd>{numero}</dd>
                </div>
              );
            })}
            <div>
              <dt>concluída</dt>
              <dd>{percentual(feitos, total)}%</dd>
            </div>
          </dl>
        </header>
        {faseAtual && (
          <ProximoPortao
            fase={faseAtual}
            hoje={hoje}
            icone={trilha.icone}
            pausa={pausa}
            inicio={inicio}
            aoVer={verOQueFalta}
          />
        )}
      </div>

      <Mapa
        trilha={trilha}
        fases={fases}
        atual={atual}
        inicio={inicio}
        selecionada={selecionada}
        aoSelecionar={setSelecionada}
      />
      <Pilulas
        fases={fases}
        atual={atual}
        selecionada={selecionada}
        aoSelecionar={setSelecionada}
      />
      {pausas.length > 0 && <Pausas pausas={pausas} agora={pausa} />}

      {fase && (
        <div
          ref={detalhe}
          tabIndex={-1}
          id="detalhe-fase"
          className={s.detalhe}
          style={coresDaFase(fase)}
          aria-label={`Fase ${selecionada + 1}: ${fase.nome}`}
          role="region"
        >
          <Portao
            key={`portao-${fase.id}`}
            fase={fase}
            numero={selecionada + 1}
            hoje={hoje}
            aoAlternar={(id) => alternarRequisito(selecionada, id)}
          />
          <Recursos
            key={`recursos-${fase.id}`}
            fase={fase}
            aba={aba}
            aoTrocarAba={trocarAba}
            aoRegistrar={(id, delta) => registrarPratica(selecionada, id, delta)}
          />
          {fase.dica && (
            <aside className={`${s.dica} ${s.dicaRodape}`} aria-label="Dica da fase">
              {fase.dica}
            </aside>
          )}
        </div>
      )}

      <div className={s.aviso} role="alert" aria-live="assertive">
        {aviso && (
          <p>
            {aviso}
            <button type="button" onClick={() => setAviso(null)} aria-label="Fechar aviso">
              ×
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
