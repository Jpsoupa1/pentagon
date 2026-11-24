"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { enviar } from "@/lib/cliente/api";
import {
  blocosPlano,
  INICIO_PADRAO_BLOCO,
  MINUTOS_PADRAO_BLOCO,
  ROTULO_BLOCO,
  type BlocoPlano,
  type BlocosPlanoAjustes,
} from "@/lib/plano";
import { Botao } from "../ui/Botao";
import f from "../shell/Form.module.css";
import s from "./BlocosDeEstudo.module.css";

type Linha = { ligado: boolean; inicio: string; minutos: number };
type Tela = Record<"dias_uteis" | "sabado" | "domingo", Record<BlocoPlano, Linha>>;

const FIM_DE_SEMANA = [
  { tipo: "sabado", nome: "Sábado" },
  { tipo: "domingo", nome: "Domingo" },
] as const;

/** Ajustes salvos (ou nulo, os padrões) como as linhas da tela. Fim de semana começa desligado. */
function daTela(salvo: BlocosPlanoAjustes | null): Tela {
  const linha = (tipo: keyof Tela, bloco: BlocoPlano): Linha => {
    const x = salvo?.[tipo]?.[bloco];
    return {
      ligado: tipo === "dias_uteis" ? x?.ligado !== false : x?.ligado === true,
      inicio: x?.inicio ?? INICIO_PADRAO_BLOCO[bloco],
      minutos: x?.minutos ?? MINUTOS_PADRAO_BLOCO[bloco],
    };
  };
  const dia = (tipo: keyof Tela) =>
    Object.fromEntries(blocosPlano.map((b) => [b, linha(tipo, b)])) as Record<BlocoPlano, Linha>;
  return { dias_uteis: dia("dias_uteis"), sabado: dia("sabado"), domingo: dia("domingo") };
}

/** A tela como `blocos_plano`: a manhã de dia útil não leva duração, ela vem da folga do dia. */
function paraAjustes(t: Tela): BlocosPlanoAjustes {
  const uteis = t.dias_uteis;
  return {
    dias_uteis: {
      manha: { inicio: uteis.manha.inicio },
      teoria: { inicio: uteis.teoria.inicio, minutos: uteis.teoria.minutos },
      projeto: { inicio: uteis.projeto.inicio, minutos: uteis.projeto.minutos },
    },
    sabado: t.sabado,
    domingo: t.domingo,
  };
}

/**
 * Início e duração de cada bloco do plano, a hora da pergunta da folga e o aviso dos blocos.
 * Sábado e domingo começam desligados; ligar um bloco o põe na Agenda e no calendário.
 */
export function BlocosDeEstudo({
  inicial,
}: {
  inicial: {
    blocosPlano: BlocosPlanoAjustes | null;
    perguntaFolga: string;
    avisoBlocosMin: number;
  };
}) {
  const router = useRouter();
  const [tela, setTela] = useState(() => daTela(inicial.blocosPlano));
  const [pergunta, setPergunta] = useState(inicial.perguntaFolga);
  const [aviso, setAviso] = useState(String(inicial.avisoBlocosMin));
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [salvando, setSalvando] = useState(false);

  const mudar = (tipo: keyof Tela, bloco: BlocoPlano, parte: Partial<Linha>) =>
    setTela((t) => ({ ...t, [tipo]: { ...t[tipo], [bloco]: { ...t[tipo][bloco], ...parte } } }));

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (salvando) return;
    setSalvando(true);
    setMsg(null);
    const r = await enviar("PATCH", "/api/ajustes", {
      blocosPlano: paraAjustes(tela),
      perguntaFolga: pergunta,
      avisoBlocosMin: Number(aviso),
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
        : "Blocos salvos. Agenda e calendário já usam os novos horários.",
    });
    router.refresh();
  }

  return (
    <form className={f.form} onSubmit={salvar}>
      <fieldset className={s.grupo}>
        <legend className={f.rotulo}>Dias úteis</legend>
        <ul className={s.lista}>
          {blocosPlano.map((bloco) => {
            const x = tela.dias_uteis[bloco];
            const nome = `Dias úteis: ${ROTULO_BLOCO[bloco]}`;
            return (
              <li key={bloco} className={s.dia}>
                <span className={s.liga}>
                  <span>
                    <strong>{ROTULO_BLOCO[bloco]}</strong>
                    {bloco === "manha" && <span className={s.tipo}>duração pela folga</span>}
                  </span>
                </span>
                <label className={s.campo}>
                  <span className="sr-only">Início de {nome}</span>
                  <input
                    type="time"
                    value={x.inicio}
                    required
                    onChange={(e) => mudar("dias_uteis", bloco, { inicio: e.target.value })}
                    className={`${f.entrada} mono`}
                  />
                </label>
                {bloco === "manha" ? (
                  <span />
                ) : (
                  <label className={s.campo}>
                    <span className="sr-only">Duração de {nome} em minutos</span>
                    <input
                      type="number"
                      min={15}
                      max={480}
                      value={x.minutos}
                      required
                      onChange={(e) =>
                        mudar("dias_uteis", bloco, { minutos: Number(e.target.value) })
                      }
                      className={`${f.entrada} mono`}
                    />
                  </label>
                )}
              </li>
            );
          })}
        </ul>
      </fieldset>

      {FIM_DE_SEMANA.map(({ tipo, nome: dia }) => (
        <fieldset key={tipo} className={s.grupo}>
          <legend className={f.rotulo}>{dia}</legend>
          <ul className={s.lista}>
            {blocosPlano.map((bloco) => {
              const x = tela[tipo][bloco];
              const nome = `${dia}: ${ROTULO_BLOCO[bloco]}`;
              return (
                <li key={bloco} className={s.dia}>
                  <label className={s.liga}>
                    <input
                      type="checkbox"
                      checked={x.ligado}
                      onChange={(e) => mudar(tipo, bloco, { ligado: e.target.checked })}
                      aria-label={nome}
                    />
                    <span>
                      <strong>{ROTULO_BLOCO[bloco]}</strong>
                    </span>
                  </label>
                  <label className={s.campo}>
                    <span className="sr-only">Início de {nome}</span>
                    <input
                      type="time"
                      value={x.inicio}
                      disabled={!x.ligado}
                      required
                      onChange={(e) => mudar(tipo, bloco, { inicio: e.target.value })}
                      className={`${f.entrada} mono`}
                    />
                  </label>
                  <label className={s.campo}>
                    <span className="sr-only">Duração de {nome} em minutos</span>
                    <input
                      type="number"
                      min={15}
                      max={480}
                      value={x.minutos}
                      disabled={!x.ligado}
                      required
                      onChange={(e) => mudar(tipo, bloco, { minutos: Number(e.target.value) })}
                      className={`${f.entrada} mono`}
                    />
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      ))}

      <div className={f.linha}>
        <label className={f.campo}>
          <span className={f.rotulo}>Hora da pergunta da folga</span>
          <input
            type="time"
            value={pergunta}
            required
            onChange={(e) => setPergunta(e.target.value)}
            className={`${f.entrada} mono`}
          />
        </label>
        <label className={f.campo}>
          <span className={f.rotulo}>Avisar quantos minutos antes dos blocos</span>
          <input
            type="number"
            min={0}
            max={1440}
            value={aviso}
            required
            onChange={(e) => setAviso(e.target.value)}
            className={`${f.entrada} mono`}
          />
        </label>
      </div>
      {msg && (
        <p className={msg.ok ? undefined : f.erroGeral} role="status">
          {msg.texto}
        </p>
      )}
      <div>
        <Botao type="submit" disabled={salvando}>
          {salvando ? "Salvando..." : "Salvar blocos"}
        </Botao>
      </div>
    </form>
  );
}
