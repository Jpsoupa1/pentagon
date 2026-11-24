"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Botao } from "@/components/ui/Botao";
import { CabecalhoPagina } from "@/components/ui/Pagina";
import { enviar } from "@/lib/cliente/api";
import { formatarHoras, slugsTrilha } from "@/lib/plano";
import {
  lerEstado,
  rotuloDe,
  type GrupoDeChecks,
  type PlanoIniciado,
  type RespostaDeConclusao,
  type RespostaDeTentativa,
  type RespostaDoPlano,
  type Retorno,
} from "./comum";
import { FolhaConclusao } from "./FolhaConclusao";
import s from "./Plano.module.css";
import { Recrutamento } from "./Recrutamento";
import { SecaoTrilha } from "./SecaoTrilha";

const SEM_CONEXAO = "Sem conexão. A alteração fica guardada e vai quando a internet voltar.";

/**
 * O plano AI Engineer: três trilhas, recrutamento e a folha de conclusão. A tela só mostra o
 * estado e chama as rotas; o estado devolvido em cada escrita substitui o da tela, sem
 * atualização otimista, e uma recusa do servidor vira mensagem.
 */
export function Plano({ inicial }: { inicial: PlanoIniciado }) {
  const [plano, setPlano] = useState(inicial);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ titulo: string; linhas: string[] } | null>(null);
  /** Código do item aberto na folha de conclusão. */
  const [aberto, setAberto] = useState<string | null>(null);
  const itemAberto =
    plano.trilhas.flatMap((t) => (t.atual ? [t.atual] : [])).find((a) => a.codigo === aberto) ??
    null;

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 6000);
    return () => clearTimeout(t);
  }, [aviso]);

  /** Escreve e troca o estado da tela pelo que voltou. Numa recusa, relê o estado do servidor. */
  async function chamar<T extends RespostaDoPlano>(
    metodo: "POST" | "PUT",
    url: string,
    corpo?: unknown,
  ): Promise<Retorno<T>> {
    setOcupado(true);
    const r = await enviar<T>(metodo, url, corpo);
    let retorno: Retorno<T>;
    if (!r.ok) {
      retorno = { ok: false, erro: r.erro };
      // Uma nota recusada fica gravada como tentativa: a tela relê para mostrá-la.
      const atual = await lerEstado();
      if (atual) setPlano(atual);
    } else if (r.enfileirado) {
      retorno = { ok: false, erro: SEM_CONEXAO };
    } else {
      retorno = { ok: true, dados: r.dados };
      if (r.dados.plano?.iniciado) setPlano(r.dados.plano);
    }
    setOcupado(false);
    return retorno;
  }

  async function marcar(
    grupo: GrupoDeChecks | "recrutamento",
    codigo: string,
    indice: number,
    feito: boolean,
  ) {
    const corpo =
      grupo === "recrutamento" ? { grupo, indice, feito } : { grupo, codigo, indice, feito };
    const r = await chamar("PUT", "/api/plano/checks", corpo);
    if (!r.ok) setAviso(r.erro);
  }

  async function somar(chave: string) {
    const r = await chamar("POST", `/api/plano/contadores/${chave}`);
    if (!r.ok) setAviso(r.erro);
  }

  async function desfazer(codigo: string) {
    const item = plano.trilhas.flatMap((t) => t.concluidos).find((c) => c.codigo === codigo);
    const r = await chamar("POST", `/api/plano/itens/${codigo}/desfazer`);
    if (!r.ok) return setAviso(r.erro);
    setResultado({ titulo: `Conclusão desfeita: ${item ? rotuloDe(item) : codigo}`, linhas: [] });
  }

  async function concluir(corpo: { nota?: number; aprovado?: boolean }) {
    const item = itemAberto!;
    const r = await chamar<RespostaDeConclusao>(
      "POST",
      `/api/plano/itens/${item.codigo}/concluir`,
      corpo,
    );
    if (r.ok) {
      setResultado({ titulo: `Concluído: ${rotuloDe(item)}`, linhas: r.dados.liberacao });
      setAberto(null);
    }
    return r;
  }

  const registrar = (nota: number) =>
    chamar<RespostaDeTentativa>("POST", `/api/plano/itens/${aberto}/tentativas`, { nota });

  const trilhas = [...plano.trilhas].sort(
    (a, b) => slugsTrilha.indexOf(a.slug) - slugsTrilha.indexOf(b.slug),
  );

  return (
    <div className={s.plano}>
      <CabecalhoPagina
        titulo="Plano"
        sobre="AI Engineer"
        acoes={
          <p className={s.meta}>Faltam {formatarHoras(plano.horasRestantes)} no plano todo.</p>
        }
      />

      {resultado && (
        <div role="status" className={s.resultado}>
          <div>
            <p>
              <strong>{resultado.titulo}</strong>
            </p>
            {resultado.linhas.map((linha) => (
              <p key={linha}>{linha}</p>
            ))}
          </div>
          <Botao variante="fantasma" pequeno onClick={() => setResultado(null)}>
            Entendi
          </Botao>
        </div>
      )}

      <div className={s.pilha}>
        {trilhas.map((trilha) => (
          <SecaoTrilha
            key={trilha.slug}
            trilha={trilha}
            plano={plano}
            ocupado={ocupado}
            acoes={{
              aoMarcar: marcar,
              aoConcluir: (codigo) => {
                setResultado(null);
                setAberto(codigo);
              },
              aoDesfazer: desfazer,
            }}
          />
        ))}
        {plano.recrutamento && (
          <Recrutamento
            recrutamento={plano.recrutamento}
            ocupado={ocupado}
            aoMarcar={(indice, feito) => marcar("recrutamento", "", indice, feito)}
            aoSomar={somar}
          />
        )}
      </div>

      <p className={s.discreto}>
        <Link href="/plano/arquivadas">Trilhas arquivadas</Link>
      </p>

      <FolhaConclusao
        item={itemAberto}
        aoFechar={() => setAberto(null)}
        aoConcluir={concluir}
        aoRegistrar={registrar}
      />

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
