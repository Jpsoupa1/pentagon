"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Botao } from "@/components/ui/Botao";
import { CaixaSelecao } from "@/components/ui/CaixaSelecao";
import { Cartao, CartaoCabeca } from "@/components/ui/Cartao";
import { CabecalhoPagina } from "@/components/ui/Pagina";
import { enviar } from "@/lib/cliente/api";
import { rotuloDe, type PlanoNaoIniciado } from "./comum";
import s from "./Plano.module.css";

type Requisito = { codigo: string; titulo: string };

/** Itens de uma trilha agrupados por fase, na ordem em que o catálogo os traz. */
function porFase(itens: PlanoNaoIniciado["catalogo"]["itens"]) {
  const grupos = new Map<number | null, typeof itens>();
  for (const i of itens) grupos.set(i.fase, [...(grupos.get(i.fase) ?? []), i]);
  return [...grupos];
}

/** Primeira abertura: o que já foi concluído. Depois de salva, a tela não volta. */
export function PrimeiraAbertura({ inicial }: { inicial: PlanoNaoIniciado }) {
  const router = useRouter();
  const { catalogo, sugestao } = inicial;
  const [marcados, setMarcados] = useState(() => new Set<string>(sugestao));
  const [faltam, setFaltam] = useState<Requisito[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function alternar(codigo: string, feito: boolean) {
    setFaltam(null);
    setErro(null);
    setMarcados((atual) => {
      const novo = new Set(atual);
      if (feito) novo.add(codigo);
      else novo.delete(codigo);
      return novo;
    });
  }

  async function salvar(incluirRequisitos: boolean) {
    setEnviando(true);
    setErro(null);
    const r = await enviar("POST", "/api/plano/inicio", {
      marcados: [...marcados],
      incluirRequisitos,
    });
    if (r.ok && !r.enfileirado) {
      router.replace("/plano");
      return;
    }
    setEnviando(false);
    if (r.ok) return setErro("Sem conexão. Tente salvar de novo quando a internet voltar.");
    // Requisito não marcado: o servidor lista e a pessoa decide se marca junto.
    const requisitos = (r.detalhes as { requisitos?: Requisito[] } | undefined)?.requisitos;
    if (requisitos?.length) setFaltam(requisitos);
    else setErro(r.erro);
  }

  return (
    <div className={s.plano}>
      <CabecalhoPagina
        titulo="Comece o plano"
        sobre="Primeira abertura"
        acoes={
          <p className={s.meta}>
            Marque o que você já concluiu. O resto será liberado um de cada vez.
          </p>
        }
      />

      <div className={s.pilha}>
        {catalogo.trilhas.map((trilha) => {
          const itens = catalogo.itens.filter((i) => i.trilha === trilha.slug);
          return (
            <Cartao key={trilha.slug} aria-labelledby={`inicio-${trilha.slug}`}>
              <CartaoCabeca titulo={<span id={`inicio-${trilha.slug}`}>{trilha.nome}</span>} />
              {porFase(itens).map(([fase, doGrupo]) => (
                <fieldset key={fase ?? "sem-fase"} className={s.checklist}>
                  {fase !== null && (
                    <legend className={s.rotuloBloco}>
                      Fase {fase}: {catalogo.fases.find((f) => f.numero === fase)?.nome}
                    </legend>
                  )}
                  <ul>
                    {doGrupo.map((i) => (
                      <li key={i.codigo}>
                        <CaixaSelecao
                          checked={marcados.has(i.codigo)}
                          disabled={enviando}
                          onChange={(e) => alternar(i.codigo, e.target.checked)}
                        >
                          {rotuloDe(i)}
                          {i.opcional ? " (opcional)" : ""}
                        </CaixaSelecao>
                      </li>
                    ))}
                  </ul>
                </fieldset>
              ))}
            </Cartao>
          );
        })}
      </div>

      {faltam && (
        <div role="alert" className={s.resultado}>
          <div>
            <p>
              <strong>Faltam requisitos dos itens marcados:</strong>
            </p>
            <ul>
              {faltam.map((r) => (
                <li key={r.codigo}>{rotuloDe(r)}</li>
              ))}
            </ul>
            <p>Marcar estes itens junto?</p>
          </div>
          <Botao disabled={enviando} onClick={() => void salvar(true)}>
            Marcar junto
          </Botao>
        </div>
      )}
      <div role="alert" className={s.erro}>
        {erro}
      </div>

      <div className={s.rodape}>
        <p className={s.meta}>{marcados.size} itens marcados</p>
        <Botao disabled={enviando} onClick={() => void salvar(false)}>
          Salvar e começar
        </Botao>
      </div>
    </div>
  );
}
