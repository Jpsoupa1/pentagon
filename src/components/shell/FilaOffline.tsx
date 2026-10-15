"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { contarPendentes, EVENTO_FILA, sincronizar } from "@/lib/cliente/fila";
import { useOnline } from "@/lib/cliente/hooks";
import s from "./Shell.module.css";

/** Aviso discreto enquanto houver alterações esperando conexão; sincroniza quando ela volta. */
export function FilaOffline() {
  const router = useRouter();
  const online = useOnline();
  const [pendentes, setPendentes] = useState(0);

  useEffect(() => {
    const atualizar = () => void contarPendentes().then(setPendentes);
    window.addEventListener(EVENTO_FILA, atualizar);
    atualizar();
    return () => window.removeEventListener(EVENTO_FILA, atualizar);
  }, []);

  useEffect(() => {
    if (!online) return;
    sincronizar().then(({ enviados, descartados }) => {
      if (enviados || descartados) router.refresh();
    });
  }, [online, router]);

  if (!pendentes && online) return null;
  return (
    <div className={s.fila} role="status">
      <span className={s.filaPonto} aria-hidden />
      {pendentes
        ? `${pendentes} ${pendentes === 1 ? "alteração aguardando" : "alterações aguardando"} conexão`
        : "Sem conexão. Mostrando a última versão salva."}
    </div>
  );
}
