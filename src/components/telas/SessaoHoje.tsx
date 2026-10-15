"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { enviar } from "@/lib/cliente/api";
import { useRelogio } from "@/lib/cliente/hooks";
import { duracaoTexto } from "@/lib/tempo";
import { Botao } from "../ui/Botao";
import s from "./SessaoHoje.module.css";

export type SessaoHojeCliente = {
  id: string;
  rotulo: string;
  tipo: string;
  conteudo: string;
  detalhe: string;
  minutos: number;
  feita: boolean;
};

const CHAVE = (id: string) => `pentagon:sessao-iniciada:${id}`;

const EVENTO = "pentagon:sessao-iniciada";

function lerInicio(id: string): string | null {
  try {
    return localStorage.getItem(CHAVE(id));
  } catch {
    return null;
  }
}

function gravarInicio(id: string, valor: number | null) {
  try {
    if (valor === null) localStorage.removeItem(CHAVE(id));
    else localStorage.setItem(CHAVE(id), String(valor));
  } catch {}
  window.dispatchEvent(new Event(EVENTO));
}

function assinar(avisar: () => void) {
  window.addEventListener(EVENTO, avisar);
  window.addEventListener("storage", avisar);
  return () => {
    window.removeEventListener(EVENTO, avisar);
    window.removeEventListener("storage", avisar);
  };
}

/** Cartão verde da sessão do dia: Começar marca o início (neste aparelho), Concluir grava no banco. */
export function SessaoHoje({
  sessao,
  agoraServidor,
}: {
  sessao: SessaoHojeCliente | null;
  agoraServidor: number;
}) {
  const router = useRouter();
  const agora = useRelogio(agoraServidor) ?? agoraServidor;
  const salvo = useSyncExternalStore(
    assinar,
    () => (sessao ? lerInicio(sessao.id) : null),
    () => null,
  );
  const inicio = salvo ? Number(salvo) : null;
  const [ocupado, setOcupado] = useState(false);

  if (!sessao) {
    return (
      <section className={s.cartao} aria-labelledby="sessao-hoje">
        <span className={s.rotulo}>Sessão de hoje</span>
        <h2 id="sessao-hoje" className={s.titulo}>
          Sem sessão hoje.
        </h2>
        <p className={s.meta}>Aproveite para descansar ou adiantar a revisão.</p>
      </section>
    );
  }

  async function marcar(feita: boolean) {
    setOcupado(true);
    const r = await enviar("PATCH", `/api/estudos/sessoes/${sessao!.id}`, { feita });
    setOcupado(false);
    if (r.ok) {
      gravarInicio(sessao!.id, null);
      router.refresh();
    }
  }

  function comecar() {
    gravarInicio(sessao!.id, Date.now());
  }

  const decorrido = inicio ? Math.max(0, Math.floor((agora - inicio) / 60_000)) : 0;

  return (
    <section className={s.cartao} aria-labelledby="sessao-hoje">
      <div className={s.topo}>
        <span className={s.rotulo}>{sessao.rotulo}</span>
        <span className={`${s.chip} mono`}>{duracaoTexto(sessao.minutos)}</span>
      </div>
      <h2 id="sessao-hoje" className={s.titulo}>
        {sessao.tipo}: {sessao.conteudo}
      </h2>
      <p className={s.meta}>{sessao.detalhe}</p>
      {sessao.feita ? (
        <div className={s.acoes}>
          <span className={s.feita}>Sessão feita</span>
          <Botao variante="claro" pequeno onClick={() => marcar(false)} disabled={ocupado}>
            Desfazer
          </Botao>
        </div>
      ) : inicio ? (
        <div className={s.acoes}>
          <span className={`${s.meta} mono`} role="timer">
            em andamento há {duracaoTexto(decorrido)}
          </span>
          <Botao
            variante="claro"
            className={s.concluir}
            onClick={() => marcar(true)}
            disabled={ocupado}
          >
            Concluir
          </Botao>
        </div>
      ) : (
        <div className={s.acoes}>
          <Botao variante="claro" className={s.concluir} onClick={comecar}>
            Começar
          </Botao>
          <Botao variante="claro" onClick={() => marcar(true)} disabled={ocupado}>
            Já fiz
          </Botao>
        </div>
      )}
    </section>
  );
}
