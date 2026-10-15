"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { enviar } from "@/lib/cliente/api";
import { CaixaSelecao } from "../ui/CaixaSelecao";
import s from "../ui/Pagina.module.css";

export type SessaoCliente = { id: string; rotulo: string; texto: string; feita: boolean };

/** Sessões da trilha com caixa de seleção; marcar sincroniza com os outros aparelhos. */
export function ListaSessoes({ sessoes }: { sessoes: SessaoCliente[] }) {
  const router = useRouter();
  const [, iniciar] = useTransition();
  const [lista, marcar] = useOptimistic(
    sessoes,
    (atual, { id, feita }: { id: string; feita: boolean }) =>
      atual.map((x) => (x.id === id ? { ...x, feita } : x)),
  );
  return (
    <ul className={s.lista}>
      {lista.map((x) => (
        <li key={x.id}>
          <CaixaSelecao
            checked={x.feita}
            onChange={(e) => {
              const feita = e.target.checked;
              iniciar(async () => {
                marcar({ id: x.id, feita });
                await enviar("PATCH", `/api/estudos/sessoes/${x.id}`, { feita });
                router.refresh();
              });
            }}
          >
            <span className="mono" style={{ color: "var(--text-2)", fontSize: 13 }}>
              {x.rotulo}
            </span>{" "}
            {x.texto}
          </CaixaSelecao>
        </li>
      ))}
    </ul>
  );
}
