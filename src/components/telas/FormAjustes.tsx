"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { enviar } from "@/lib/cliente/api";
import { Botao } from "../ui/Botao";
import f from "../shell/Form.module.css";

export function FormAjustes({
  inicial,
}: {
  inicial: { avisoMin: number; periodoInicio: string | null; periodoFim: string | null };
}) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const txt = (k: string) => String(d.get(k) ?? "").trim();
    setSalvando(true);
    const r = await enviar("PATCH", "/api/ajustes", {
      avisoMin: Number(txt("aviso") || 0),
      periodoInicio: txt("inicio") || null,
      periodoFim: txt("fim") || null,
    });
    setSalvando(false);
    if (!r.ok) {
      setMsg({ ok: false, texto: Object.values(r.campos ?? {})[0]?.[0] ?? r.erro });
      return;
    }
    setMsg({
      ok: true,
      texto: r.enfileirado
        ? "Salvo no aparelho. Sincroniza quando a conexão voltar."
        : "Ajustes salvos.",
    });
    router.refresh();
  }

  return (
    <form className={f.form} onSubmit={salvar}>
      <div className={f.linha}>
        <label className={f.campo}>
          <span className={f.rotulo}>Início do semestre</span>
          <input
            type="date"
            name="inicio"
            defaultValue={inicial.periodoInicio ?? ""}
            className={f.entrada}
          />
        </label>
        <label className={f.campo}>
          <span className={f.rotulo}>Fim do semestre</span>
          <input
            type="date"
            name="fim"
            defaultValue={inicial.periodoFim ?? ""}
            className={f.entrada}
          />
        </label>
      </div>
      <p style={{ fontSize: 13, color: "var(--text-2)" }}>
        As aulas só aparecem entre o início e o fim do semestre. Sem datas, elas repetem sem fim.
      </p>
      <label className={f.campo}>
        <span className={f.rotulo}>Avisar quantos minutos antes das sessões de estudo</span>
        <input
          type="number"
          name="aviso"
          min={0}
          max={1440}
          defaultValue={inicial.avisoMin}
          className={`${f.entrada} mono`}
        />
      </label>
      {msg && (
        <p className={msg.ok ? undefined : f.erroGeral} role="status">
          {msg.texto}
        </p>
      )}
      <div>
        <Botao type="submit" disabled={salvando}>
          {salvando ? "Salvando..." : "Salvar ajustes"}
        </Botao>
      </div>
    </form>
  );
}
