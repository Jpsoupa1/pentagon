"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { enviar } from "@/lib/cliente/api";
import { Botao } from "../ui/Botao";
import s from "../ui/Pagina.module.css";

/** Avança a trilha sem datas quando a fase atual está consolidada (ou volta uma fase). */
export function MudarFase({
  slug,
  fase,
  primeira,
  ultima,
}: {
  slug: string;
  fase: number;
  primeira: number;
  ultima: number;
}) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function ir(faseAtual: number) {
    setOcupado(true);
    setErro(null);
    const r = await enviar("PATCH", `/api/estudos/trilhas/${slug}`, { faseAtual });
    setOcupado(false);
    if (r.ok) router.refresh();
    else setErro(r.erro);
  }

  return (
    <div className={s.acoes}>
      {fase < ultima && (
        <Botao variante="secundario" pequeno onClick={() => ir(fase + 1)} disabled={ocupado}>
          Fase consolidada, avançar
        </Botao>
      )}
      {fase > primeira && (
        <Botao variante="fantasma" pequeno onClick={() => ir(fase - 1)} disabled={ocupado}>
          Voltar uma fase
        </Botao>
      )}
      {erro && (
        <p role="alert" className={s.meta}>
          {erro}
        </p>
      )}
    </div>
  );
}
