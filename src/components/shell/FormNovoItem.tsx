"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { enviar } from "@/lib/cliente/api";
import { AREAS } from "@/lib/areas";
import {
  assessmentKinds,
  TIPO_AVALIACAO_NOME,
  type AreaId,
  type TipoAvaliacao,
} from "@/lib/dominio";
import { DIAS_CURTOS, hmParaMin, hojeLocal } from "@/lib/tempo";
import { Botao } from "../ui/Botao";
import { AvisoConflito, type DetalhesConflito } from "./AvisoConflito";
import f from "./Form.module.css";

export type DisciplinaOpcao = { id: string; nome: string; sigla: string };

export type ValoresEvento = {
  titulo: string;
  areaId: AreaId;
  subjectId: string | null;
  data: string;
  inicio: string;
  fim: string;
  diaInteiro: boolean;
  diasSemana: number[] | null;
  repeteAte: string | null;
  local: string | null;
  notas: string | null;
  lembrarMin: number | null;
};

export type ValoresAvaliacao = {
  tipo: TipoAvaliacao;
  titulo: string;
  subjectId: string | null;
  data: string;
  hora: string;
  peso: number | null;
  nota: number | null;
  anotacoes: string | null;
  lembrarMin: number | null;
};

export type Edicao =
  | { tipo: "evento"; id: string; valores: ValoresEvento }
  | { tipo: "avaliacao"; id: string; valores: ValoresAvaliacao };

type Repetir = "nao" | "semana" | "uteis";

const LEMBRAR = [
  { valor: "", rotulo: "Não avisar" },
  { valor: "0", rotulo: "Na hora" },
  { valor: "10", rotulo: "10 min antes" },
  { valor: "15", rotulo: "15 min antes" },
  { valor: "30", rotulo: "30 min antes" },
  { valor: "60", rotulo: "1 h antes" },
  { valor: "120", rotulo: "2 h antes" },
  { valor: "180", rotulo: "3 h antes" },
  { valor: "1440", rotulo: "1 dia antes" },
];

function repetirDe(dias: number[] | null): Repetir {
  if (!dias?.length) return "nao";
  return dias.join() === "1,2,3,4,5" ? "uteis" : "semana";
}

/** Criar ou editar um compromisso ou uma prova/entrega. Mostra conflitos de horário antes de salvar. */
export function FormNovoItem({
  disciplinas,
  inicial = {},
  editar,
  aoSalvar,
}: {
  disciplinas: DisciplinaOpcao[];
  inicial?: { area?: AreaId; data?: string };
  editar?: Edicao;
  aoSalvar: () => void;
}) {
  const router = useRouter();
  const id = useId();
  const ev = editar?.tipo === "evento" ? editar.valores : null;
  const av = editar?.tipo === "avaliacao" ? editar.valores : null;
  const [area, setArea] = useState<AreaId>(av ? "provas" : (ev?.areaId ?? inicial.area ?? "aulas"));
  const [tipo, setTipo] = useState<TipoAvaliacao>(av?.tipo ?? "prova");
  const [repetir, setRepetir] = useState<Repetir>(repetirDe(ev?.diasSemana ?? null));
  const [dias, setDias] = useState<number[]>(ev?.diasSemana ?? []);
  const [diaInteiro, setDiaInteiro] = useState(ev?.diaInteiro ?? false);
  const [erro, setErro] = useState<string | null>(null);
  const [campos, setCampos] = useState<Record<string, string[]>>({});
  const [conflito, setConflito] = useState<DetalhesConflito | null>(null);
  const [pendente, setPendente] = useState<{ url: string; corpo: Record<string, unknown> } | null>(
    null,
  );
  const [salvando, setSalvando] = useState(false);

  const ehProva = area === "provas";
  const comDisciplina = area === "aulas" || ehProva;
  const metodo = editar ? "PUT" : "POST";
  const areasPermitidas = editar
    ? AREAS.filter((a) => (av ? a.id === "provas" : a.id !== "provas"))
    : AREAS;
  const lembrarPadrao = editar ? String((ev ?? av)?.lembrarMin ?? "") : ehProva ? "120" : "10";

  async function enviarAgora(url: string, corpo: Record<string, unknown>) {
    setSalvando(true);
    const r = await enviar(metodo, url, corpo);
    setSalvando(false);
    if (!r.ok) {
      const d = r.detalhes as DetalhesConflito | undefined;
      if (d?.conflitos) {
        setConflito(d);
        setPendente({ url, corpo });
        return;
      }
      setErro(r.erro);
      setCampos(r.campos ?? {});
      return;
    }
    setConflito(null);
    router.refresh();
    aoSalvar();
  }

  async function salvar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const dados = new FormData(e.currentTarget);
    const texto = (k: string) => String(dados.get(k) ?? "").trim();
    const numero = (k: string) => (texto(k) ? Number(texto(k).replace(",", ".")) : null);
    const lembrar = texto("lembrar");
    const data = texto("data");
    const inicio = texto("inicio");
    const fim = texto("fim");
    setErro(null);
    setCampos({});
    setConflito(null);

    if (ehProva) {
      const url = editar ? `/api/avaliacoes/${editar.id}` : "/api/avaliacoes";
      return enviarAgora(url, {
        tipo,
        titulo: texto("titulo"),
        subjectId: texto("disciplina") || null,
        data,
        hora: inicio || "23:59",
        peso: numero("peso"),
        nota: numero("nota"),
        anotacoes: texto("notas"),
        lembrarMin: lembrar ? Number(lembrar) : null,
      });
    }

    let duracaoMin = 60;
    if (diaInteiro) duracaoMin = 1440;
    else if (inicio && fim) {
      duracaoMin = hmParaMin(fim) - hmParaMin(inicio);
      if (duracaoMin <= 0) {
        setCampos({ fim: ["O fim precisa ser depois do início"] });
        return;
      }
    }
    const diasSemana = repetir === "uteis" ? [1, 2, 3, 4, 5] : repetir === "semana" ? dias : null;
    if (repetir === "semana" && !dias.length) {
      setCampos({ diasSemana: ["Escolha pelo menos um dia"] });
      return;
    }
    const url = editar ? `/api/eventos/${editar.id}` : "/api/eventos";
    return enviarAgora(url, {
      titulo: texto("titulo"),
      areaId: area,
      subjectId: comDisciplina ? texto("disciplina") || null : null,
      data,
      hora: diaInteiro ? "00:00" : inicio,
      duracaoMin,
      diaInteiro,
      diasSemana,
      repeteAte: diasSemana ? texto("ate") || null : null,
      local: texto("local"),
      notas: texto("notas"),
      lembrarMin: lembrar ? Number(lembrar) : null,
    });
  }

  const erroDe = (k: string) =>
    campos[k]?.length ? (
      <span className={f.erro} id={`${id}-${k}-erro`}>
        {campos[k][0]}
      </span>
    ) : null;

  return (
    <form className={f.form} onSubmit={salvar}>
      <label className={f.campo}>
        <span className={f.rotulo}>Título</span>
        <input
          name="titulo"
          required
          maxLength={120}
          autoComplete="off"
          className={f.entrada}
          defaultValue={(ev ?? av)?.titulo ?? ""}
          placeholder="Ex.: Lista de exercícios 3"
        />
        {erroDe("titulo")}
      </label>

      {areasPermitidas.length > 1 && (
        <fieldset className={f.grupo}>
          <legend className={f.rotulo}>Área</legend>
          <div className={f.chips}>
            {areasPermitidas.map((a) => (
              <label key={a.id} className={f.chipOpcao} data-area={a.id}>
                <input
                  type="radio"
                  name="area"
                  value={a.id}
                  checked={area === a.id}
                  onChange={() => setArea(a.id)}
                />
                <span>
                  <span className={f.ponto} aria-hidden />
                  {a.curto}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {ehProva && (
        <label className={f.campo}>
          <span className={f.rotulo}>Tipo</span>
          <select
            className={f.entrada}
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoAvaliacao)}
          >
            {assessmentKinds.map((k) => (
              <option key={k} value={k}>
                {TIPO_AVALIACAO_NOME[k]}
              </option>
            ))}
          </select>
        </label>
      )}

      {comDisciplina && (
        <label className={f.campo}>
          <span className={f.rotulo}>Disciplina</span>
          <select
            name="disciplina"
            className={f.entrada}
            defaultValue={(ev ?? av)?.subjectId ?? ""}
          >
            <option value="">
              {disciplinas.length ? "Sem disciplina" : "Nenhuma disciplina cadastrada"}
            </option>
            {disciplinas.map((d) => (
              <option key={d.id} value={d.id}>
                {d.sigla} · {d.nome}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className={f.linha}>
        <label className={f.campo}>
          <span className={f.rotulo}>{ev?.diasSemana ? "Começa em" : "Data"}</span>
          <input
            type="date"
            name="data"
            required
            defaultValue={(ev ?? av)?.data ?? inicial.data ?? hojeLocal()}
            className={f.entrada}
          />
          {erroDe("data")}
        </label>
        {!diaInteiro && (
          <label className={f.campo}>
            <span className={f.rotulo}>{ehProva ? "Horário" : "Início"}</span>
            <input
              type="time"
              name="inicio"
              required={!ehProva}
              defaultValue={av?.hora ?? ev?.inicio ?? (ehProva ? "" : "09:00")}
              className={`${f.entrada} mono`}
            />
            {erroDe("hora")}
          </label>
        )}
        {!diaInteiro && !ehProva && (
          <label className={f.campo}>
            <span className={f.rotulo}>Fim</span>
            <input
              type="time"
              name="fim"
              required
              defaultValue={ev?.fim ?? "10:00"}
              className={`${f.entrada} mono`}
            />
            {erroDe("fim")}
          </label>
        )}
      </div>

      {ehProva && (
        <div className={f.linha}>
          <label className={f.campo}>
            <span className={f.rotulo}>Peso (opcional)</span>
            <input
              name="peso"
              inputMode="decimal"
              defaultValue={av?.peso ?? ""}
              className={`${f.entrada} mono`}
            />
            {erroDe("peso")}
          </label>
          {editar && (
            <label className={f.campo}>
              <span className={f.rotulo}>Nota</span>
              <input
                name="nota"
                inputMode="decimal"
                defaultValue={av?.nota ?? ""}
                className={`${f.entrada} mono`}
              />
              {erroDe("nota")}
            </label>
          )}
        </div>
      )}

      {!ehProva && (
        <>
          <label className={f.marcar}>
            <input
              type="checkbox"
              checked={diaInteiro}
              onChange={(e) => setDiaInteiro(e.target.checked)}
            />
            Dia inteiro (feriado, viagem)
          </label>

          <label className={f.campo}>
            <span className={f.rotulo}>Repetir</span>
            <select
              className={f.entrada}
              value={repetir}
              onChange={(e) => setRepetir(e.target.value as Repetir)}
            >
              <option value="nao">Não repete</option>
              <option value="uteis">Segunda a sexta</option>
              <option value="semana">Toda semana, em dias escolhidos</option>
            </select>
          </label>

          {repetir === "semana" && (
            <fieldset className={f.grupo}>
              <legend className={f.rotulo}>Dias</legend>
              <div className={f.dias}>
                {DIAS_CURTOS.map((d, i) => (
                  <label key={d} className={f.dia}>
                    <input
                      type="checkbox"
                      checked={dias.includes(i)}
                      onChange={(e) =>
                        setDias((v) => (e.target.checked ? [...v, i] : v.filter((x) => x !== i)))
                      }
                    />
                    <span>{d}</span>
                  </label>
                ))}
              </div>
              {erroDe("diasSemana")}
            </fieldset>
          )}

          {repetir !== "nao" && (
            <label className={f.campo}>
              <span className={f.rotulo}>Repetir até (opcional)</span>
              <input
                type="date"
                name="ate"
                defaultValue={ev?.repeteAte ?? ""}
                className={f.entrada}
              />
              {erroDe("repeteAte")}
            </label>
          )}

          <label className={f.campo}>
            <span className={f.rotulo}>Local (opcional)</span>
            <input
              name="local"
              maxLength={120}
              className={f.entrada}
              autoComplete="off"
              defaultValue={ev?.local ?? ""}
            />
          </label>
        </>
      )}

      <label className={f.campo}>
        <span className={f.rotulo}>
          {ehProva ? "Avisar também (além da véspera)" : "Lembrar antes"}
        </span>
        <select
          name="lembrar"
          className={f.entrada}
          defaultValue={lembrarPadrao}
          key={lembrarPadrao}
        >
          {LEMBRAR.map((l) => (
            <option key={l.valor} value={l.valor}>
              {l.rotulo}
            </option>
          ))}
        </select>
      </label>

      <label className={f.campo}>
        <span className={f.rotulo}>{ehProva ? "Anotações" : "Notas"}</span>
        <textarea
          name="notas"
          rows={3}
          maxLength={ehProva ? 5000 : 2000}
          className={f.entrada}
          defaultValue={ev?.notas ?? av?.anotacoes ?? ""}
        />
      </label>

      {erro && (
        <p className={f.erroGeral} role="alert">
          {erro}
        </p>
      )}

      {conflito && pendente && (
        <AvisoConflito
          detalhes={conflito}
          ocupado={salvando}
          aoConfirmar={() =>
            enviarAgora(pendente.url, { ...pendente.corpo, ignorarConflito: true })
          }
        />
      )}

      <Botao type="submit" largo disabled={salvando}>
        {salvando ? "Salvando..." : editar ? "Salvar alterações" : "Salvar na agenda"}
      </Botao>
    </form>
  );
}
