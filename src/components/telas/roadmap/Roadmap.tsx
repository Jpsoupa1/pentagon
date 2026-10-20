"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { enviar } from "@/lib/cliente/api";
import { percentual, semanasDoPeriodo } from "@/lib/roadmap";
import { duracaoTexto } from "@/lib/tempo";
import type { FaseRoadmap, RoadmapDados } from "@/server/servicos/roadmap";
import { coresDaFase, feitosDe } from "./comum";
import { Mapa, Pilulas } from "./Mapa";
import { Portao } from "./Portao";
import { ProximoPortao } from "./ProximoPortao";
import { Recursos } from "./Recursos";
import s from "./Roadmap.module.css";

/**
 * Roadmap de uma trilha: mapa das fases, o portão da fase selecionada e os recursos.
 * Marcar requisito e somar prática atualizam a tela na hora e voltam atrás se o servidor recusar.
 */
export function Roadmap({ inicial }: { inicial: RoadmapDados }) {
  const { trilha, hoje, atual, semanaZeroAgora, minutosPorSemana } = inicial;
  const [fases, setFases] = useState(inicial.fases);
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

  function verOQueFalta() {
    setSelecionada(Math.max(0, atual));
    detalhe.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    detalhe.current?.focus({ preventScroll: true });
  }

  const total = fases.reduce((t, f) => t + f.requisitos.length, 0);
  const feitos = fases.reduce((t, f) => t + feitosDe(f), 0);
  const semanas = fases.reduce((t, f) => t + semanasDoPeriodo(f), 0);
  const certificacoes = fases.filter((f) => f.portaoTipo === "exam").length;
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
          <h1 className={s.titulo}>
            <span className={s.tituloLongo}>{trilha.titulo}</span>
            <span className={s.tituloCurto}>Roadmap</span>
          </h1>
          <p className={s.sobre}>{trilha.sobre}</p>
          <dl className={s.numeros}>
            <div>
              <dt>fases</dt>
              <dd>{fases.length}</dd>
            </div>
            <div>
              <dt>certificações</dt>
              <dd>{certificacoes}</dd>
            </div>
            <div>
              <dt>semanas</dt>
              <dd>{semanas}</dd>
            </div>
            <div>
              <dt>por semana</dt>
              <dd>{duracaoTexto(minutosPorSemana)}</dd>
            </div>
            <div>
              <dt>concluída</dt>
              <dd>{percentual(feitos, total)}%</dd>
            </div>
          </dl>
        </header>
        {faseAtual && <ProximoPortao fase={faseAtual} hoje={hoje} aoVer={verOQueFalta} />}
      </div>

      <Mapa
        trilha={trilha}
        fases={fases}
        atual={atual}
        semanaZeroAgora={semanaZeroAgora}
        selecionada={selecionada}
        aoSelecionar={setSelecionada}
      />
      <Pilulas
        fases={fases}
        atual={atual}
        selecionada={selecionada}
        aoSelecionar={setSelecionada}
      />

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
