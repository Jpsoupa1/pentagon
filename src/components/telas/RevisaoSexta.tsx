"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { enviar } from "@/lib/cliente/api";
import { ETAPAS_REVISAO } from "@/lib/estudos";
import { Botao } from "../ui/Botao";
import { CaixaSelecao } from "../ui/CaixaSelecao";
import { FolhaInferior } from "../ui/FolhaInferior";
import f from "../shell/Form.module.css";
import { FormErro, type PadraoErro } from "./FormErro";
import s from "./Revisao.module.css";

export type RevisaoCliente = {
  etapas: boolean[];
  nota: number | null;
  pontosFracos: string | null;
};

/**
 * Roteiro da revisão de sexta (folha em branco, bateria, correção, nota e pontos fracos),
 * gravado por semana. Os erros da correção vão direto para o caderno.
 */
export function RevisaoSexta({
  weekId,
  semana,
  inicial,
  erros,
  padraoErro,
  rotuloBotao = "Abrir roteiro",
  variante = "secundario",
}: {
  weekId: string;
  semana: number;
  inicial: RevisaoCliente | null;
  erros: { id: string; tema: string; errei: string }[];
  padraoErro: PadraoErro;
  rotuloBotao?: string;
  variante?: "secundario" | "claro";
}) {
  const router = useRouter();
  const [aberta, setAberta] = useState(false);
  const [etapas, setEtapas] = useState(inicial?.etapas ?? [false, false, false, false]);
  const [nota, setNota] = useState(inicial?.nota === null || !inicial ? "" : String(inicial.nota));
  const [pontos, setPontos] = useState(inicial?.pontosFracos ?? "");
  const [anotando, setAnotando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setSalvando(true);
    const r = await enviar("PUT", `/api/estudos/revisoes/${weekId}`, {
      etapas,
      nota: nota === "" ? null : Number(nota),
      pontosFracos: pontos,
    });
    setSalvando(false);
    if (!r.ok) {
      setMsg({ ok: false, texto: Object.values(r.campos ?? {})[0]?.[0] ?? r.erro });
      return;
    }
    setMsg({ ok: true, texto: "Revisão salva." });
    router.refresh();
  }

  return (
    <>
      <Botao variante={variante} pequeno onClick={() => setAberta(true)}>
        {rotuloBotao}
      </Botao>
      <FolhaInferior
        aberta={aberta}
        aoFechar={() => setAberta(false)}
        titulo={`Revisão de sexta · semana ${semana}`}
      >
        <form className={f.form} onSubmit={salvar}>
          <ol className={s.etapas}>
            {ETAPAS_REVISAO.map((etapa, i) => (
              <li key={etapa.titulo}>
                <CaixaSelecao
                  checked={etapas[i]}
                  onChange={(e) =>
                    setEtapas((atual) => atual.map((v, j) => (j === i ? e.target.checked : v)))
                  }
                >
                  <span className={s.etapaTitulo}>
                    {i + 1}. {etapa.titulo}{" "}
                    <span className="mono" style={{ color: "var(--text-2)" }}>
                      {etapa.minutos} min
                    </span>
                  </span>
                  <span className={s.etapaComo}>{etapa.como}</span>
                </CaixaSelecao>
              </li>
            ))}
          </ol>
          <div className={s.nota}>
            <label className={f.campo}>
              <span className={f.rotulo}>Nota (0 a 10)</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={10}
                step={1}
                className={`${f.entrada} mono`}
                value={nota}
                onChange={(e) => setNota(e.target.value)}
              />
            </label>
          </div>
          <label className={f.campo}>
            <span className={f.rotulo}>Os 2 ou 3 pontos mais fracos</span>
            <textarea
              className={f.entrada}
              rows={3}
              maxLength={500}
              value={pontos}
              placeholder="Eles entram na revisão de domingo."
              onChange={(e) => setPontos(e.target.value)}
            />
          </label>
          {msg && (
            <p className={msg.ok ? s.ok : f.erroGeral} role="status">
              {msg.texto}
            </p>
          )}
          <div>
            <Botao type="submit" disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar revisão"}
            </Botao>
          </div>
        </form>
        <section className={s.caderno} aria-label="Erros desta semana">
          <h3 className={s.subtitulo}>Erros anotados nesta semana</h3>
          {erros.length ? (
            <ul className={s.listaErros}>
              {erros.map((x) => (
                <li key={x.id}>
                  <strong>{x.tema}:</strong> {x.errei}
                </li>
              ))}
            </ul>
          ) : (
            <p className={s.vazio}>Nenhum ainda. Anote cada exercício errado na correção.</p>
          )}
          {anotando ? (
            <FormErro padrao={padraoErro} />
          ) : (
            <div>
              <Botao variante="secundario" pequeno onClick={() => setAnotando(true)}>
                Anotar erro
              </Botao>
            </div>
          )}
        </section>
      </FolhaInferior>
    </>
  );
}
