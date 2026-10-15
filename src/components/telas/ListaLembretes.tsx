"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { enviar } from "@/lib/cliente/api";
import { CaixaSelecao } from "../ui/CaixaSelecao";
import s from "../ui/Pagina.module.css";

export type LembreteCliente = {
  id: string;
  texto: string;
  hora: string;
  concluido: boolean;
  atrasado?: boolean;
};

export function ListaLembretes({ lembretes }: { lembretes: LembreteCliente[] }) {
  const router = useRouter();
  const [, iniciar] = useTransition();
  const [lista, marcar] = useOptimistic(
    lembretes,
    (atual, { id, concluido }: { id: string; concluido: boolean }) =>
      atual.map((l) => (l.id === id ? { ...l, concluido } : l)),
  );

  function alternar(id: string, concluido: boolean) {
    iniciar(async () => {
      marcar({ id, concluido });
      await enviar("PATCH", `/api/lembretes/${id}`, { concluido });
      router.refresh();
    });
  }

  return (
    <ul className={s.lista}>
      {lista.map((l) => (
        <li key={l.id}>
          <CaixaSelecao checked={l.concluido} onChange={(e) => alternar(l.id, e.target.checked)}>
            {l.texto}{" "}
            <span className={`${s.meta} mono`}>
              {l.atrasado ? "atrasado · " : ""}
              {l.hora}
            </span>
          </CaixaSelecao>
        </li>
      ))}
    </ul>
  );
}
