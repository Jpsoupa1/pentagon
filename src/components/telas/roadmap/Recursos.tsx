"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { feitoDaPratica, percentual } from "@/lib/roadmap";
import type { FaseRoadmap } from "@/server/servicos/roadmap";
import { Icone } from "../../shell/icones";
import { dataBr } from "./comum";
import s from "./Roadmap.module.css";

type Aba = "cursos" | "provas" | "pratica";
type Filtro = "todos" | "free" | "paid";

const TIPO: Record<string, string> = { simulado: "Simulado", prova: "Prova", entrega: "Entrega" };

/** De onde o contador soma sozinho (mostrado embaixo do título da prática). */
function origem(fonte: string | null) {
  if (!fonte) return null;
  if (fonte.startsWith("cards:")) return `Soma sozinho com os flashcards ${fonte.slice(6)}`;
  if (fonte === "sessoes:pratica") return "Soma sozinho com as sessões de prática feitas";
  if (fonte === "revisoes") return "Soma sozinho com as revisões de sexta com nota";
  return null;
}

/** Coluna de recursos: cursos (com filtro de preço), provas e simulados e prática com contadores. */
export function Recursos({
  fase,
  aoRegistrar,
}: {
  fase: FaseRoadmap;
  aoRegistrar: (id: string, delta: 1 | -1) => void;
}) {
  const [aba, setAba] = useState<Aba>("cursos");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const abas = useRef<HTMLDivElement>(null);
  const gratis = fase.recursos.filter((r) => r.preco === "free").length;
  const pagos = fase.recursos.length - gratis;
  const lista: { id: Aba; longo: string; curto: string; n: number }[] = [
    { id: "cursos", longo: "Cursos", curto: "Cursos", n: fase.recursos.length },
    { id: "provas", longo: "Provas e simulados", curto: "Provas", n: fase.avaliacoes.length },
    { id: "pratica", longo: "Prática", curto: "Prática", n: fase.pratica.length },
  ];
  const recursos = fase.recursos.filter((r) => filtro === "todos" || r.preco === filtro);

  function teclado(e: KeyboardEvent) {
    const passo = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!passo) return;
    e.preventDefault();
    const i = (lista.findIndex((a) => a.id === aba) + passo + lista.length) % lista.length;
    setAba(lista[i].id);
    abas.current?.querySelectorAll<HTMLButtonElement>("[role=tab]")[i]?.focus();
  }

  return (
    <section className={s.recursos} aria-label="Recursos da fase">
      <div ref={abas} className={s.abas} role="tablist" aria-label="Recursos" onKeyDown={teclado}>
        {lista.map((a) => (
          <button
            key={a.id}
            type="button"
            role="tab"
            id={`aba-${a.id}`}
            aria-controls={`painel-${a.id}`}
            aria-selected={aba === a.id}
            tabIndex={aba === a.id ? 0 : -1}
            className={s.aba}
            onClick={() => setAba(a.id)}
          >
            <span className={s.abaLonga}>{a.longo}</span>
            <span className={s.abaCurta}>{a.curto}</span>
            <span className={`${s.abaContagem} mono`}>{a.n}</span>
          </button>
        ))}
      </div>

      <div
        key={aba}
        role="tabpanel"
        id={`painel-${aba}`}
        aria-labelledby={`aba-${aba}`}
        className={`${s.painel} ${s.entrada}`}
      >
        {aba === "cursos" && (
          <>
            <div className={s.filtros} role="group" aria-label="Filtrar por preço">
              {(
                [
                  ["todos", "Todos"],
                  ["free", `Gratuitos · ${gratis}`],
                  ["paid", `Pagos · ${pagos}`],
                ] as [Filtro, string][]
              ).map(([v, rotulo]) => (
                <button
                  key={v}
                  type="button"
                  className={s.filtro}
                  aria-pressed={filtro === v}
                  onClick={() => setFiltro(v)}
                >
                  {rotulo}
                </button>
              ))}
            </div>
            <ul className={s.grade}>
              {recursos.map((r) => (
                <li key={r.id} className={s.curso}>
                  <span className={s.cursoSelos}>
                    <span className={s.preco} data-preco={r.preco}>
                      {r.preco === "free" ? "Gratuito" : "Pago"}
                    </span>
                    <span className={`${s.idioma} mono`}>{r.idioma}</span>
                  </span>
                  <h3 className={s.cursoTitulo}>{r.titulo}</h3>
                  <span className={s.cursoFornecedor}>{r.fornecedor}</span>
                  <p className={s.cursoNota}>{r.nota}</p>
                  <span className={s.cursoPe}>
                    <span className="mono">{r.precoTexto}</span>
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className={s.abrir}>
                      Abrir <Icone nome="externo" tamanho={16} />
                      <span className="sr-only"> {r.titulo} (abre em nova aba)</span>
                    </a>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}

        {aba === "provas" && (
          <ol className={s.tempo}>
            {fase.avaliacoes.map((a) => (
              <li key={a.id} data-destaque={a.tipo !== "simulado" || undefined}>
                <span className={`${s.tempoData} mono`}>
                  {a.data ? (
                    <>
                      {dataBr(a.data).slice(0, 5)}
                      <span>{a.data.slice(0, 4)}</span>
                    </>
                  ) : (
                    <>
                      Sem data<span>{a.opcional ? "opcional" : ""}</span>
                    </>
                  )}
                </span>
                <span className={s.tempoPonto} aria-hidden />
                <div className={s.tempoCorpo}>
                  <span className={s.tempoTopo}>
                    <span className={s.tipo} data-tipo={a.tipo}>
                      {TIPO[a.tipo]}
                    </span>
                    {a.opcional && <span className={s.selo}>opcional</span>}
                  </span>
                  <h3 className={s.tempoTitulo}>{a.titulo}</h3>
                  <p className={s.tempoFormato}>
                    {a.formato} · <span className="mono">{a.precoTexto}</span>
                  </p>
                  <p className={s.tempoNota}>{a.nota}</p>
                </div>
              </li>
            ))}
          </ol>
        )}

        {aba === "pratica" && (
          <ul className={s.grade}>
            {fase.pratica.map((p) => {
              const feito = feitoDaPratica(p);
              const pct = percentual(feito, p.meta);
              const de = origem(p.fonte);
              return (
                <li key={p.id} className={s.pratica}>
                  <h3 className={s.cursoTitulo}>{p.titulo}</h3>
                  <span className={s.cursoFornecedor}>{p.cadencia}</span>
                  {de && <span className={s.praticaFonte}>{de}</span>}
                  <span className={s.praticaContagem}>
                    <span className="mono">
                      <strong>{feito}</strong>/{p.meta}
                    </span>
                    <span className={s.praticaAcoes}>
                      {p.manual > 0 && (
                        <button
                          type="button"
                          className={s.botaoRedondo}
                          data-fraco
                          aria-label={`Desfazer o último registro de ${p.titulo}`}
                          onClick={() => aoRegistrar(p.id, -1)}
                        >
                          <Icone nome="menos" tamanho={18} />
                        </button>
                      )}
                      <button
                        type="button"
                        className={s.botaoRedondo}
                        aria-label={`Registrar mais um: ${p.titulo}`}
                        onClick={() => aoRegistrar(p.id, 1)}
                      >
                        <Icone nome="mais" tamanho={20} />
                      </button>
                    </span>
                  </span>
                  <span
                    className={s.dominioBarra}
                    role="progressbar"
                    aria-label={`Progresso de ${p.titulo}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={pct}
                  >
                    <span style={{ width: `${pct}%` }} />
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {fase.custo && (
        <p className={s.custo}>
          Custo estimado da fase <span className="mono">{fase.custo}</span>
        </p>
      )}
    </section>
  );
}
