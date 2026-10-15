"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { enviar } from "@/lib/cliente/api";
import type { HorariosEstudo as Horarios } from "@/lib/dominio";
import { TIPO_SESSAO } from "@/lib/estudos";
import { DIAS, DIAS_CURTOS } from "@/lib/tempo";
import { Botao } from "../ui/Botao";
import f from "../shell/Form.module.css";
import s from "./HorariosEstudo.module.css";

const ORDEM = [1, 2, 3, 4, 5, 6, 0];

/** Horário de cada tipo de sessão. Mudar aqui só move a hora: o progresso da trilha fica. */
export function HorariosEstudo({ inicial }: { inicial: Horarios }) {
  const router = useRouter();
  const [h, setH] = useState(inicial);
  const [msg, setMsg] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const mudar = (
    d: number,
    campo: "ativo" | "inicio" | "minutos",
    valor: boolean | string | number,
  ) => setH((atual) => ({ ...atual, [d]: { ...atual[String(d)], [campo]: valor } }));

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setSalvando(true);
    const r = await enviar("PATCH", "/api/ajustes", { horariosEstudo: h });
    setSalvando(false);
    setMsg(
      r.ok ? "Horários salvos. Agenda, avisos e calendário já usam os novos horários." : r.erro,
    );
    if (r.ok) router.refresh();
  }

  return (
    <form className={f.form} onSubmit={salvar}>
      <ul className={s.lista}>
        {ORDEM.map((d) => {
          const x = h[String(d)];
          return (
            <li key={d} className={s.dia}>
              <label className={s.liga}>
                <input
                  type="checkbox"
                  checked={x.ativo}
                  onChange={(e) => mudar(d, "ativo", e.target.checked)}
                />
                <span>
                  <strong>{DIAS_CURTOS[d]}</strong>
                  <span className={s.tipo}>{TIPO_SESSAO[d]}</span>
                </span>
              </label>
              <label className={s.campo}>
                <span className="sr-only">Início de {DIAS[d]}</span>
                <input
                  type="time"
                  value={x.inicio}
                  disabled={!x.ativo}
                  required
                  onChange={(e) => mudar(d, "inicio", e.target.value)}
                  className={`${f.entrada} mono`}
                />
              </label>
              <label className={s.campo}>
                <span className="sr-only">Duração de {DIAS[d]} em minutos</span>
                <select
                  value={x.minutos}
                  disabled={!x.ativo}
                  onChange={(e) => mudar(d, "minutos", Number(e.target.value))}
                  className={`${f.entrada} mono`}
                >
                  {[30, 45, 60, 90, 120, 150, 180, 240].map((m) => (
                    <option key={m} value={m}>
                      {m >= 60
                        ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60}` : ""}`
                        : `${m} min`}
                    </option>
                  ))}
                </select>
              </label>
            </li>
          );
        })}
      </ul>
      {msg && (
        <p role="status" style={{ fontSize: 13, color: "var(--text-2)" }}>
          {msg}
        </p>
      )}
      <div>
        <Botao type="submit" disabled={salvando}>
          {salvando ? "Salvando..." : "Salvar horários"}
        </Botao>
      </div>
    </form>
  );
}
