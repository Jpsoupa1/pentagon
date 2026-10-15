"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { enviar } from "@/lib/cliente/api";
import { useRelogio } from "@/lib/cliente/hooks";
import { AREA_POR_ID } from "@/lib/areas";
import type { AreaId } from "@/lib/dominio";
import { dataCurta, duracaoTexto, hojeLocal, horaLocal, partesLocais } from "@/lib/tempo";
import { BarraProgresso } from "../ui/BarraProgresso";
import { Botao } from "../ui/Botao";
import { useNovoItem } from "../shell/NovoItemProvider";
import s from "./CartaoAgora.module.css";

export type OcorrenciaCliente = {
  origem: "evento" | "sessao" | "marco";
  eventId: string;
  dataOriginal: string;
  titulo: string;
  areaId: AreaId;
  local: string | null;
  inicio: string;
  fim: string;
};

const ADIAR_MIN = 15;

/** Cartão escuro com o compromisso em andamento (ou o próximo). */
export function CartaoAgora({
  atual,
  proximo,
  fuso,
  agoraServidor,
}: {
  atual: OcorrenciaCliente | null;
  proximo: OcorrenciaCliente | null;
  fuso: string;
  /** Instante (ms) em que o servidor montou a página; evita diferença na hidratação. */
  agoraServidor: number;
}) {
  const router = useRouter();
  const { abrir } = useNovoItem();
  const agora = useRelogio(agoraServidor) ?? agoraServidor;
  const [ocupado, setOcupado] = useState(false);

  // Quando o compromisso termina ou o próximo começa, recarrega os dados do servidor.
  const limite = atual ? Date.parse(atual.fim) : proximo ? Date.parse(proximo.inicio) : null;
  useEffect(() => {
    if (limite && agora >= limite) router.refresh();
  }, [agora, limite, router]);

  const item = atual ?? proximo;
  if (!item) {
    return (
      <section className={s.cartao} aria-labelledby="agora-titulo">
        <span className={s.rotulo}>Agora</span>
        <h2 id="agora-titulo" className={s.titulo}>
          Nada agendado por enquanto.
        </h2>
        <p className={s.meta}>
          Adicione aulas, estágio ou estudos e eles aparecem aqui na hora certa.
        </p>
        <div className={s.acoes}>
          <Botao variante="claro" onClick={() => abrir()}>
            Novo item
          </Botao>
        </div>
      </section>
    );
  }

  const inicio = new Date(item.inicio);
  const fim = new Date(item.fim);
  const area = AREA_POR_ID[item.areaId];
  const total = fim.getTime() - inicio.getTime();
  const progresso = atual ? (agora - inicio.getTime()) / total : 0;
  const restante = Math.max(
    0,
    Math.ceil(((atual ? fim.getTime() : inicio.getTime()) - agora) / 60_000),
  );
  const outroDia = partesLocais(inicio, fuso).data !== hojeLocal(new Date(agora), fuso);

  async function excecao(novoInicioMs: number, duracaoMin: number) {
    setOcupado(true);
    const novo = partesLocais(new Date(novoInicioMs), fuso);
    const r = await enviar("POST", `/api/eventos/${item!.eventId}/excecoes`, {
      data: item!.dataOriginal,
      tipo: "movida",
      novaData: novo.data,
      novaHora: novo.hora,
      novaDuracaoMin: Math.max(5, duracaoMin),
    });
    setOcupado(false);
    if (r.ok) router.refresh();
  }

  const ehSessao = item.origem === "sessao";
  const adiar = () => excecao(inicio.getTime() + ADIAR_MIN * 60_000, total / 60_000);
  // Concluir encerra a ocorrência agora (só a deste dia); numa sessão de estudo, marca como feita.
  async function concluir() {
    if (!ehSessao)
      return excecao(inicio.getTime(), Math.round((agora - inicio.getTime()) / 60_000));
    setOcupado(true);
    const r = await enviar("PATCH", `/api/estudos/sessoes/${item!.eventId}`, { feita: true });
    setOcupado(false);
    if (r.ok) router.refresh();
  }

  return (
    <section className={s.cartao} data-area={item.areaId} aria-labelledby="agora-titulo">
      <div className={s.topo}>
        <span className={s.rotulo}>{atual ? "Agora" : "A seguir"}</span>
        <span className={s.chip}>
          <span className={s.ponto} aria-hidden />
          {area.nome}
        </span>
      </div>
      <p className={`${s.horario} mono`}>
        {outroDia && `${dataCurta(partesLocais(inicio, fuso).data)} · `}
        {horaLocal(inicio, fuso)} – {horaLocal(fim, fuso)}
      </p>
      <h2 id="agora-titulo" className={s.titulo}>
        {item.titulo}
      </h2>
      {item.local && <p className={s.meta}>{item.local}</p>}
      {atual ? (
        <>
          <BarraProgresso valor={progresso} rotulo="Andamento" escura />
          <p className={`${s.meta} mono`}>termina em {duracaoTexto(restante)}</p>
        </>
      ) : (
        <p className={`${s.meta} mono`}>começa em {duracaoTexto(restante)}</p>
      )}
      <div className={s.acoes}>
        {!ehSessao && (
          <Botao variante="claro" onClick={adiar} disabled={ocupado}>
            Adiar {ADIAR_MIN} min
          </Botao>
        )}
        {(atual || ehSessao) && (
          <Botao variante="claro" onClick={concluir} disabled={ocupado} className={s.concluir}>
            Concluir
          </Botao>
        )}
      </div>
    </section>
  );
}
