"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { enviar } from "@/lib/cliente/api";
import { dataDeRevisao, REVISAR_APOS_DIAS } from "@/lib/estudos";
import { Botao } from "../ui/Botao";
import f from "../shell/Form.module.css";

export type PadraoErro = {
  data: string;
  tema: string;
  origem?: "revisao_semanal" | "pratica";
  sessaoId?: string;
};

/** Uma linha do caderno de erros: data, tema, o que errei, como é o certo e quando revisar. */
export function FormErro({ padrao, aoSalvar }: { padrao: PadraoErro; aoSalvar?: () => void }) {
  const router = useRouter();
  const [data, setData] = useState(padrao.data);
  const [tema, setTema] = useState(padrao.tema);
  const [errei, setErrei] = useState("");
  const [correto, setCorreto] = useState("");
  const [revisarEm, setRevisarEm] = useState(dataDeRevisao(padrao.data));
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [salvando, setSalvando] = useState(false);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setSalvando(true);
    const r = await enviar("POST", "/api/estudos/erros", {
      data,
      tema,
      errei,
      correto,
      revisarEm,
      origem: padrao.origem,
      sessaoId: padrao.sessaoId,
    });
    setSalvando(false);
    if (!r.ok) {
      setErro(Object.values(r.campos ?? {})[0]?.[0] ?? r.erro);
      return;
    }
    setErro(null);
    setSalvo(true);
    setErrei("");
    setCorreto("");
    router.refresh();
    aoSalvar?.();
  }

  return (
    <form className={f.form} onSubmit={salvar} aria-label="Anotar erro no caderno">
      <div className={f.linha}>
        <label className={f.campo}>
          <span className={f.rotulo}>Data</span>
          <input
            type="date"
            className={f.entrada}
            value={data}
            required
            onChange={(e) => {
              setData(e.target.value);
              if (e.target.value) setRevisarEm(dataDeRevisao(e.target.value));
            }}
          />
        </label>
        <label className={f.campo}>
          <span className={f.rotulo}>Revisar de novo em</span>
          <input
            type="date"
            className={f.entrada}
            value={revisarEm}
            required
            onChange={(e) => setRevisarEm(e.target.value)}
          />
        </label>
      </div>
      <label className={f.campo}>
        <span className={f.rotulo}>Tema</span>
        <input
          className={f.entrada}
          value={tema}
          required
          maxLength={120}
          onChange={(e) => setTema(e.target.value)}
        />
      </label>
      <label className={f.campo}>
        <span className={f.rotulo}>O que errei</span>
        <textarea
          className={f.entrada}
          rows={2}
          value={errei}
          required
          maxLength={500}
          onChange={(e) => {
            setErrei(e.target.value);
            setSalvo(false);
          }}
        />
      </label>
      <label className={f.campo}>
        <span className={f.rotulo}>Como é o certo</span>
        <textarea
          className={f.entrada}
          rows={2}
          value={correto}
          required
          maxLength={500}
          onChange={(e) => setCorreto(e.target.value)}
        />
      </label>
      {erro && (
        <p className={f.erroGeral} role="alert">
          {erro}
        </p>
      )}
      {salvo && (
        <p role="status" style={{ fontSize: 13, color: "var(--text-2)" }}>
          Erro anotado. Ele volta na revisão de domingo {REVISAR_APOS_DIAS} dias depois.
        </p>
      )}
      <div>
        <Botao type="submit" disabled={salvando}>
          {salvando ? "Salvando..." : "Anotar erro"}
        </Botao>
      </div>
    </form>
  );
}
