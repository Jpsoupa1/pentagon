"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { enviar } from "@/lib/cliente/api";
import { Botao } from "../ui/Botao";
import f from "../shell/Form.module.css";
import s from "../ui/Pagina.module.css";

/** Endereço webcal:// do feed, com copiar, gerar novo e revogar, e o passo a passo do iPhone. */
export function FeedCalendario({ token, host }: { token: string | null; host: string }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const endereco = token ? `webcal://${host}/api/calendario/${token}.ics` : null;

  async function gerar() {
    setOcupado(true);
    const r = await enviar("POST", "/api/calendario/token");
    setOcupado(false);
    setMsg(r.ok ? "Endereço novo gerado. O anterior parou de funcionar." : r.erro);
    router.refresh();
  }
  async function revogar() {
    setOcupado(true);
    await enviar("DELETE", "/api/calendario/token");
    setOcupado(false);
    setMsg("Endereço revogado. Calendários assinados param de atualizar.");
    router.refresh();
  }
  async function copiar() {
    if (!endereco) return;
    try {
      await navigator.clipboard.writeText(endereco);
      setMsg("Endereço copiado.");
    } catch {
      setMsg("Não deu para copiar. Selecione o endereço e copie manualmente.");
    }
  }

  return (
    <div className={s.pilha}>
      {endereco ? (
        <>
          <label className={f.campo}>
            <span className={f.rotulo}>Endereço do calendário</span>
            <input
              readOnly
              value={endereco}
              className={`${f.entrada} mono`}
              onFocus={(e) => e.target.select()}
            />
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Botao onClick={copiar}>Copiar endereço</Botao>
            <Botao variante="secundario" onClick={gerar} disabled={ocupado}>
              Gerar novo endereço
            </Botao>
            <Botao variante="fantasma" onClick={revogar} disabled={ocupado}>
              Revogar
            </Botao>
          </div>
        </>
      ) : (
        <div>
          <Botao onClick={gerar} disabled={ocupado}>
            Gerar endereço do calendário
          </Botao>
        </div>
      )}
      {msg && (
        <p role="status" className={s.meta}>
          {msg}
        </p>
      )}
      <details>
        <summary
          style={{
            cursor: "pointer",
            fontWeight: 600,
            minHeight: 44,
            display: "flex",
            alignItems: "center",
          }}
        >
          Como assinar no iPhone
        </summary>
        <ol
          style={{
            margin: "8px 0 0",
            paddingLeft: 20,
            display: "grid",
            gap: 6,
            color: "var(--text-2)",
            fontSize: 14,
          }}
        >
          <li>Toque em Copiar endereço.</li>
          <li>
            Abra Ajustes → Apps → Calendário → Contas de Calendário → Adicionar Conta → Outra →
            Adicionar Calendário Assinado.
          </li>
          <li>Cole o endereço e toque em Seguinte.</li>
          <li>
            <strong>Desligue “Remover Alertas”</strong>, senão o iPhone apaga os avisos de cada
            sessão. Salve.
          </li>
          <li>
            Para ver na tela bloqueada: toque e segure a tela bloqueada → Personalizar → Tela
            Bloqueada → toque na área de widgets → Calendário → “Próximo evento”.
          </li>
          <li>
            Mudou um horário aqui? O calendário atualiza sozinho (o iPhone busca de tempos em
            tempos).
          </li>
        </ol>
      </details>
    </div>
  );
}
