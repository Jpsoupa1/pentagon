"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { enviar } from "@/lib/cliente/api";
import { Botao } from "../ui/Botao";
import s from "./Revisao.module.css";

export type ErroCliente = {
  id: string;
  rotulo: string;
  tema: string;
  errei: string;
  correto: string;
};

/**
 * Revisão espaçada de domingo: refazer cada erro sem olhar a resposta. "Acertei" tira o erro
 * da lista; "Errei de novo" marca para três semanas depois.
 */
export function RevisaoEspacada({ erros }: { erros: ErroCliente[] }) {
  const router = useRouter();
  const [, iniciar] = useTransition();
  const [lista, tirar] = useOptimistic(erros, (atual, id: string) =>
    atual.filter((x) => x.id !== id),
  );
  const responder = (id: string, resultado: "acertei" | "errei") =>
    iniciar(async () => {
      tirar(id);
      await enviar("PATCH", `/api/estudos/erros/${id}`, { resultado });
      router.refresh();
    });

  if (!lista.length) return <p className={s.vazio}>Nenhum erro para revisar nesta semana.</p>;
  return (
    <ul className={s.revisar}>
      {lista.map((x) => (
        <li key={x.id} className={s.erro}>
          <span className={`${s.erroData} mono`}>{x.rotulo}</span>
          <strong>{x.tema}</strong>
          <span>{x.errei}</span>
          <details className={s.resposta}>
            <summary>Ver como é o certo</summary>
            {x.correto}
          </details>
          <span className={s.botoes}>
            <Botao pequeno onClick={() => responder(x.id, "acertei")}>
              Acertei
            </Botao>
            <Botao variante="secundario" pequeno onClick={() => responder(x.id, "errei")}>
              Errei de novo
            </Botao>
          </span>
        </li>
      ))}
    </ul>
  );
}
