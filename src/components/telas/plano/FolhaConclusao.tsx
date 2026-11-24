"use client";

import { useState } from "react";
import { Botao } from "@/components/ui/Botao";
import { CaixaSelecao } from "@/components/ui/CaixaSelecao";
import { FolhaInferior } from "@/components/ui/FolhaInferior";
import {
  rotuloDe,
  type ItemAtual,
  type RespostaDeConclusao,
  type RespostaDeTentativa,
  type Retorno,
} from "./comum";
import s from "./Plano.module.css";

type Props = {
  aoConcluir: (corpo: {
    nota?: number;
    aprovado?: boolean;
  }) => Promise<Retorno<RespostaDeConclusao>>;
  aoRegistrar: (nota: number) => Promise<Retorno<RespostaDeTentativa>>;
};

const NOTA_INVALIDA = "Informe uma nota inteira de 0 a 100.";

/**
 * Folha de conclusão: critério, confirmação e, nos itens com nota, o campo de 0 a 100.
 * Quem decide se passou é o servidor; aqui só aparece a mensagem que ele devolve.
 */
export function FolhaConclusao({
  item,
  aoFechar,
  ...acoes
}: Props & {
  /** O item aberto na folha; nulo com a folha fechada. */
  item: ItemAtual | null;
  aoFechar: () => void;
}) {
  return (
    <FolhaInferior
      aberta={item !== null}
      aoFechar={aoFechar}
      titulo={item ? `Concluir ${rotuloDe(item)}` : "Concluir"}
    >
      {item && <Formulario key={item.codigo} item={item} {...acoes} />}
    </FolhaInferior>
  );
}

function Formulario({ item, aoConcluir, aoRegistrar }: Props & { item: ItemAtual }) {
  const avaliacao = item.avaliacao;
  const [confirmado, setConfirmado] = useState(false);
  const [aprovado, setAprovado] = useState(false);
  const [nota, setNota] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  /** A nota digitada: `undefined` se vazia, `NaN` se não for um inteiro de 0 a 100. */
  function notaDigitada() {
    if (nota.trim() === "") return undefined;
    const n = Number(nota);
    return Number.isInteger(n) && n >= 0 && n <= 100 ? n : Number.NaN;
  }

  async function concluir() {
    const n = notaDigitada();
    if (Number.isNaN(n)) return setErro(NOTA_INVALIDA);
    setEnviando(true);
    setErro(null);
    setMensagem(null);
    const r = await aoConcluir({
      ...(n !== undefined && { nota: n }),
      ...(avaliacao?.tipo === "aprovacao" && { aprovado }),
    });
    // Se deu certo, a folha fecha e este formulário sai da tela: só a recusa volta para cá.
    if (!r.ok) setErro(r.erro);
    setEnviando(false);
  }

  async function registrar() {
    const n = notaDigitada();
    if (n === undefined || Number.isNaN(n)) return setErro(NOTA_INVALIDA);
    setEnviando(true);
    setErro(null);
    setMensagem(null);
    const r = await aoRegistrar(n);
    if (r.ok) setMensagem(r.dados.tentativa.mensagem);
    else setErro(r.erro);
    setEnviando(false);
  }

  return (
    <form
      className={s.folha}
      onSubmit={(e) => {
        e.preventDefault();
        void concluir();
      }}
    >
      <div>
        <h3 className={s.rotuloBloco}>Critério de conclusão</h3>
        <p>{item.criterio}</p>
      </div>

      {avaliacao?.tipo === "nota" && (
        <div className={s.campo}>
          <label htmlFor="nota-plano">Nota (0 a 100)</label>
          <input
            id="nota-plano"
            type="number"
            inputMode="numeric"
            min={0}
            max={100}
            step={1}
            value={nota}
            onChange={(e) => setNota(e.target.value)}
          />
          <p className={s.meta}>
            Para passar, {avaliacao.minima}% ou mais
            {avaliacao.aprovacoes > 1 ? `, em ${avaliacao.aprovacoes} tentativas` : ""}.
          </p>
        </div>
      )}

      {avaliacao?.tipo === "aprovacao" && (
        <CaixaSelecao checked={aprovado} onChange={(e) => setAprovado(e.target.checked)}>
          Fui aprovado
        </CaixaSelecao>
      )}

      <CaixaSelecao checked={confirmado} onChange={(e) => setConfirmado(e.target.checked)}>
        Cumpri o critério de conclusão
      </CaixaSelecao>

      <div role="alert" className={s.erro}>
        {erro}
      </div>
      <div role="status" className={s.meta}>
        {mensagem}
      </div>

      <div className={s.acoesFolha}>
        {avaliacao?.tipo === "nota" && (
          <Botao variante="secundario" disabled={enviando} onClick={() => void registrar()}>
            Registrar só a nota
          </Botao>
        )}
        <Botao type="submit" disabled={enviando || !confirmado}>
          Concluir
        </Botao>
      </div>
    </form>
  );
}
