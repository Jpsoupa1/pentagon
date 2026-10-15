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
import f from "./Form.module.css";

export type DisciplinaOpcao = { id: string; nome: string; sigla: string };

type Repetir = "nao" | "semana" | "uteis";

const LEMBRAR = [
  { valor: "", rotulo: "Não avisar" },
  { valor: "0", rotulo: "Na hora" },
  { valor: "10", rotulo: "10 min antes" },
  { valor: "30", rotulo: "30 min antes" },
  { valor: "60", rotulo: "1 h antes" },
  { valor: "1440", rotulo: "1 dia antes" },
];

export function FormNovoItem({
  disciplinas,
  inicial,
  aoSalvar,
}: {
  disciplinas: DisciplinaOpcao[];
  inicial: { area?: AreaId; data?: string };
  aoSalvar: () => void;
}) {
  const router = useRouter();
  const id = useId();
  const [area, setArea] = useState<AreaId>(inicial.area ?? "aulas");
  const [tipo, setTipo] = useState<TipoAvaliacao>("prova");
  const [repetir, setRepetir] = useState<Repetir>("nao");
  const [dias, setDias] = useState<number[]>([]);
  const [diaInteiro, setDiaInteiro] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [campos, setCampos] = useState<Record<string, string[]>>({});
  const [salvando, setSalvando] = useState(false);

  const ehProva = area === "provas";
  const comDisciplina = area === "aulas" || ehProva;

  async function salvar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const dados = new FormData(e.currentTarget);
    const texto = (k: string) => String(dados.get(k) ?? "").trim();
    const lembrar = texto("lembrar");
    const data = texto("data");
    const inicio = texto("inicio");
    const fim = texto("fim");
    setErro(null);
    setCampos({});

    let url: string;
    let corpo: Record<string, unknown>;
    if (ehProva) {
      url = "/api/avaliacoes";
      corpo = {
        tipo,
        titulo: texto("titulo"),
        subjectId: texto("disciplina") || null,
        data,
        hora: inicio || "23:59",
        anotacoes: texto("notas"),
        lembrarMin: lembrar ? Number(lembrar) : null,
      };
    } else {
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
      url = "/api/eventos";
      corpo = {
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
      };
    }

    setSalvando(true);
    const r = await enviar("POST", url, corpo);
    setSalvando(false);
    if (!r.ok) {
      setErro(r.erro);
      setCampos(r.campos ?? {});
      return;
    }
    router.refresh();
    aoSalvar();
  }

  const erroDe = (k: string) =>
    campos[k]?.length ? (
      <span className={f.erro} id={`${id}-${k}-erro`}>
        {campos[k][0]}
      </span>
    ) : null;

  return (
    <form className={f.form} onSubmit={salvar} noValidate={false}>
      <label className={f.campo}>
        <span className={f.rotulo}>Título</span>
        <input
          name="titulo"
          required
          maxLength={120}
          autoComplete="off"
          className={f.entrada}
          placeholder="Ex.: Lista de exercícios 3"
        />
        {erroDe("titulo")}
      </label>

      <fieldset className={f.grupo}>
        <legend className={f.rotulo}>Área</legend>
        <div className={f.chips}>
          {AREAS.map((a) => (
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
          <select name="disciplina" className={f.entrada} defaultValue="">
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
          <span className={f.rotulo}>Data</span>
          <input
            type="date"
            name="data"
            required
            defaultValue={inicial.data ?? hojeLocal()}
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
              defaultValue={ehProva ? "" : "09:00"}
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
              defaultValue="10:00"
              className={`${f.entrada} mono`}
            />
            {erroDe("fim")}
          </label>
        )}
      </div>

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
              <input type="date" name="ate" className={f.entrada} />
              {erroDe("repeteAte")}
            </label>
          )}

          <label className={f.campo}>
            <span className={f.rotulo}>Local (opcional)</span>
            <input name="local" maxLength={120} className={f.entrada} autoComplete="off" />
          </label>
        </>
      )}

      <label className={f.campo}>
        <span className={f.rotulo}>Lembrar antes</span>
        <select name="lembrar" className={f.entrada} defaultValue="10">
          {LEMBRAR.map((l) => (
            <option key={l.valor} value={l.valor}>
              {l.rotulo}
            </option>
          ))}
        </select>
      </label>

      <label className={f.campo}>
        <span className={f.rotulo}>Notas</span>
        <textarea name="notas" rows={3} maxLength={2000} className={f.entrada} />
      </label>

      {erro && (
        <p className={f.erroGeral} role="alert">
          {erro}
        </p>
      )}

      <Botao type="submit" largo disabled={salvando}>
        {salvando ? "Salvando..." : "Salvar na agenda"}
      </Botao>
    </form>
  );
}
