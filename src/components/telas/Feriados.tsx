"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { enviar } from "@/lib/cliente/api";
import { AREAS } from "@/lib/areas";
import type { AreaId } from "@/lib/dominio";
import { dataCurta, DIAS_CURTOS, diaDaSemana } from "@/lib/tempo";
import f from "../shell/Form.module.css";
import { Botao } from "../ui/Botao";
import s from "../ui/Pagina.module.css";
import { BotaoApagar } from "./Acoes";

type Feriado = { id: string; data: string; nome: string; areasCanceladas: AreaId[] };

/** Feriados cancelam as ocorrências das áreas marcadas naquele dia (padrão: aulas e estágio). */
export function Feriados({ feriados, anos }: { feriados: Feriado[]; anos: number[] }) {
  const router = useRouter();
  const [areas, setAreas] = useState<AreaId[]>(["aulas", "estagio"]);
  const [msg, setMsg] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function adicionar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const d = new FormData(form);
    setOcupado(true);
    const r = await enviar("POST", "/api/feriados", {
      data: String(d.get("data")),
      nome: String(d.get("nome")),
      areasCanceladas: areas,
    });
    setOcupado(false);
    setMsg(r.ok ? "Feriado salvo." : r.erro);
    if (r.ok) {
      form.reset();
      router.refresh();
    }
  }

  async function nacionais(ano: number) {
    setOcupado(true);
    const r = await enviar<{ adicionados: number }>("POST", "/api/feriados/nacionais", { ano });
    setOcupado(false);
    setMsg(
      r.ok && r.dados
        ? `${r.dados.adicionados} feriados de ${ano} adicionados.`
        : r.ok
          ? null
          : r.erro,
    );
    router.refresh();
  }

  return (
    <div className={s.pilha}>
      <p className={s.meta}>
        Num feriado, as ocorrências das áreas marcadas somem daquele dia (na agenda, nos avisos e no
        calendário).
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {anos.map((ano) => (
          <Botao
            key={ano}
            variante="secundario"
            pequeno
            disabled={ocupado}
            onClick={() => nacionais(ano)}
          >
            Adicionar feriados nacionais de {ano}
          </Botao>
        ))}
      </div>
      {feriados.length > 0 && (
        <ul className={s.lista}>
          {feriados.map((x) => (
            <li key={x.id} className={s.itemLink}>
              <span className={s.itemTexto}>
                <span className={s.itemTitulo}>{x.nome}</span>
                <span className={`${s.meta} mono`}>
                  {DIAS_CURTOS[diaDaSemana(x.data)]}, {dataCurta(x.data)} {x.data.slice(0, 4)} ·
                  cancela{" "}
                  {x.areasCanceladas.length
                    ? x.areasCanceladas.map((a) => AREAS.find((y) => y.id === a)?.curto).join(", ")
                    : "nada"}
                </span>
              </span>
              <BotaoApagar url={`/api/feriados/${x.id}`} rotulo={`Apagar feriado ${x.nome}`} />
            </li>
          ))}
        </ul>
      )}
      <form className={f.form} onSubmit={adicionar}>
        <div className={f.linha}>
          <label className={f.campo}>
            <span className={f.rotulo}>Data</span>
            <input type="date" name="data" required className={f.entrada} />
          </label>
          <label className={f.campo}>
            <span className={f.rotulo}>Nome</span>
            <input
              name="nome"
              required
              maxLength={80}
              className={f.entrada}
              placeholder="Ex.: Aniversário de Brasília"
            />
          </label>
        </div>
        <fieldset className={f.grupo}>
          <legend className={f.rotulo}>Cancela neste dia</legend>
          <div className={f.chips}>
            {AREAS.map((a) => (
              <label key={a.id} className={f.chipOpcao} data-area={a.id}>
                <input
                  type="checkbox"
                  checked={areas.includes(a.id)}
                  onChange={(e) =>
                    setAreas((v) => (e.target.checked ? [...v, a.id] : v.filter((x) => x !== a.id)))
                  }
                />
                <span>
                  <span className={f.ponto} aria-hidden />
                  {a.curto}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <Botao type="submit" disabled={ocupado}>
            Salvar feriado
          </Botao>
        </div>
      </form>
      {msg && (
        <p role="status" className={s.meta}>
          {msg}
        </p>
      )}
    </div>
  );
}

/** Quais áreas entram no calendário assinado e nos avisos. */
export function AreasNoFeed({ inicial }: { inicial: AreaId[] }) {
  const router = useRouter();
  const [areas, setAreas] = useState<AreaId[]>(inicial);
  const [msg, setMsg] = useState<string | null>(null);
  async function salvar() {
    const r = await enviar("PATCH", "/api/ajustes", { areasNoFeed: areas });
    setMsg(r.ok ? "Salvo. O calendário e os avisos já seguem essa escolha." : r.erro);
    router.refresh();
  }
  return (
    <div className={s.pilha}>
      <fieldset className={f.grupo}>
        <legend className={f.rotulo}>Áreas no calendário e nos avisos</legend>
        <div className={f.chips}>
          {AREAS.map((a) => (
            <label key={a.id} className={f.chipOpcao} data-area={a.id}>
              <input
                type="checkbox"
                checked={areas.includes(a.id)}
                onChange={(e) =>
                  setAreas((v) => (e.target.checked ? [...v, a.id] : v.filter((x) => x !== a.id)))
                }
              />
              <span>
                <span className={f.ponto} aria-hidden />
                {a.curto}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <Botao variante="secundario" onClick={salvar}>
          Salvar áreas
        </Botao>
      </div>
      {msg && (
        <p role="status" className={s.meta}>
          {msg}
        </p>
      )}
    </div>
  );
}
