"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { enviar } from "@/lib/cliente/api";
import { AREA_POR_ID } from "@/lib/areas";
import type { AreaId } from "@/lib/dominio";
import { dataLonga, DIAS_CURTOS, hmParaMin, minParaHm, partesLocais } from "@/lib/tempo";
import { Botao } from "../ui/Botao";
import { FolhaInferior } from "../ui/FolhaInferior";
import { AvisoConflito, type DetalhesConflito } from "./AvisoConflito";
import f from "./Form.module.css";
import { FormNovoItem, type DisciplinaOpcao, type ValoresEvento } from "./FormNovoItem";
import s from "./EditarOcorrencia.module.css";

export type AlvoEdicao = {
  eventId: string;
  dataOriginal: string;
  titulo: string;
  areaId: AreaId;
  inicio: string;
  fim: string;
  movida: boolean;
  recorrente: boolean;
};

type EventoApi = {
  id: string;
  titulo: string;
  areaId: AreaId;
  subjectId: string | null;
  local: string | null;
  notas: string | null;
  inicio: string;
  duracaoMin: number;
  diaInteiro: boolean;
  fuso: string;
  diasSemana: number[] | null;
  repeteDesde: string | null;
  repeteAte: string | null;
  lembrarMin: number | null;
};

const Contexto = createContext<{ abrir: (a: AlvoEdicao) => void }>({ abrir: () => {} });
export const useEditarOcorrencia = () => useContext(Contexto);

function valoresDoEvento(e: EventoApi): ValoresEvento {
  const p = partesLocais(new Date(e.inicio), e.fuso);
  return {
    titulo: e.titulo,
    areaId: e.areaId,
    subjectId: e.subjectId,
    data: e.repeteDesde ?? p.data,
    inicio: p.hora,
    fim: minParaHm(p.minutos + e.duracaoMin),
    diaInteiro: e.diaInteiro,
    diasSemana: e.diasSemana,
    repeteAte: e.repeteAte,
    local: e.local,
    notas: e.notas,
    lembrarMin: e.lembrarMin,
  };
}

export function EditarOcorrenciaProvider({
  children,
  disciplinas,
  fuso,
}: {
  children: ReactNode;
  disciplinas: DisciplinaOpcao[];
  fuso: string;
}) {
  const [alvo, setAlvo] = useState<AlvoEdicao | null>(null);
  const abrir = useCallback((a: AlvoEdicao) => setAlvo(a), []);
  const valor = useMemo(() => ({ abrir }), [abrir]);
  return (
    <Contexto.Provider value={valor}>
      {children}
      <FolhaInferior
        aberta={!!alvo}
        aoFechar={() => setAlvo(null)}
        titulo={alvo?.titulo ?? "Compromisso"}
      >
        {alvo && (
          <PainelEdicao
            key={`${alvo.eventId}:${alvo.dataOriginal}`}
            alvo={alvo}
            fuso={fuso}
            disciplinas={disciplinas}
            fechar={() => setAlvo(null)}
          />
        )}
      </FolhaInferior>
    </Contexto.Provider>
  );
}

/** Botão discreto que abre a edição de uma ocorrência (usado dentro das linhas da agenda). */
export function AbrirEdicao({
  alvo,
  children,
  className,
}: {
  alvo: AlvoEdicao;
  children: ReactNode;
  className?: string;
}) {
  const { abrir } = useEditarOcorrencia();
  return (
    <button
      type="button"
      className={[s.abrir, className].filter(Boolean).join(" ")}
      onClick={() => abrir(alvo)}
    >
      {children}
    </button>
  );
}

type Modo = "menu" | "horario" | "editar" | "apagar";

function PainelEdicao({
  alvo,
  fuso,
  disciplinas,
  fechar,
}: {
  alvo: AlvoEdicao;
  fuso: string;
  disciplinas: DisciplinaOpcao[];
  fechar: () => void;
}) {
  const router = useRouter();
  const [evento, setEvento] = useState<EventoApi | null>(null);
  const [falhou, setFalhou] = useState(false);
  const [modo, setModo] = useState<Modo>("menu");
  const [escopo, setEscopo] = useState<"dia" | "todos">("dia");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [conflito, setConflito] = useState<{
    detalhes: DetalhesConflito;
    repetir: () => Promise<void>;
  } | null>(null);

  useEffect(() => {
    let ativo = true;
    fetch(`/api/eventos/${alvo.eventId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((e: EventoApi) => ativo && setEvento(e))
      .catch(() => ativo && setFalhou(true));
    return () => {
      ativo = false;
    };
  }, [alvo.eventId]);

  const inicio = partesLocais(new Date(alvo.inicio), fuso);
  const fim = partesLocais(new Date(alvo.fim), fuso);
  const repete = evento?.diasSemana?.length
    ? evento.diasSemana.map((d) => DIAS_CURTOS[d]).join(", ")
    : null;

  async function executar(
    metodo: "POST" | "PUT" | "DELETE",
    url: string,
    corpo?: Record<string, unknown>,
  ): Promise<void> {
    setOcupado(true);
    setErro(null);
    const r = await enviar(metodo, url, corpo);
    setOcupado(false);
    if (!r.ok) {
      const d = r.detalhes as DetalhesConflito | undefined;
      if (d?.conflitos && corpo) {
        setConflito({
          detalhes: d,
          repetir: () => executar(metodo, url, { ...corpo, ignorarConflito: true }),
        });
        return;
      }
      setErro(r.erro);
      return;
    }
    router.refresh();
    fechar();
  }

  function salvarHorario(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const novaData = String(d.get("data"));
    const novoInicio = String(d.get("inicio"));
    const novoFim = String(d.get("fim"));
    const duracao = hmParaMin(novoFim) - hmParaMin(novoInicio);
    if (duracao <= 0) return setErro("O fim precisa ser depois do início.");
    setConflito(null);
    if (escopo === "dia" || !evento?.diasSemana?.length) {
      if (!alvo.recorrente && evento) {
        // Compromisso único: muda o próprio compromisso.
        const v = valoresDoEvento(evento);
        return void executar("PUT", `/api/eventos/${alvo.eventId}`, {
          ...v,
          data: novaData,
          hora: novoInicio,
          duracaoMin: duracao,
        });
      }
      return void executar("POST", `/api/eventos/${alvo.eventId}/excecoes`, {
        data: alvo.dataOriginal,
        tipo: "movida",
        novaData,
        novaHora: novoInicio,
        novaDuracaoMin: duracao,
      });
    }
    const v = valoresDoEvento(evento);
    return void executar("PUT", `/api/eventos/${alvo.eventId}`, {
      ...v,
      hora: novoInicio,
      duracaoMin: duracao,
    });
  }

  if (falhou)
    return (
      <p className={f.erroGeral}>Não foi possível abrir este compromisso. Verifique a conexão.</p>
    );

  return (
    <div className={f.form}>
      <div className={s.resumo} data-area={alvo.areaId}>
        <span className={s.chip}>
          <span className={f.ponto} aria-hidden />
          {AREA_POR_ID[alvo.areaId].nome}
        </span>
        <span className="mono">
          {dataLonga(inicio.data)} · {inicio.hora} – {fim.hora}
        </span>
        <span className={s.meta}>
          {repete ? `Repete: ${repete}` : evento ? "Não repete" : "Carregando..."}
          {alvo.movida ? " · horário mudado neste dia" : ""}
        </span>
      </div>

      {modo === "menu" && (
        <div className={s.acoes}>
          <Botao variante="secundario" largo onClick={() => setModo("horario")} disabled={!evento}>
            Mudar horário
          </Botao>
          {alvo.recorrente && (
            <Botao
              variante="secundario"
              largo
              disabled={ocupado}
              onClick={() =>
                executar("POST", `/api/eventos/${alvo.eventId}/excecoes`, {
                  data: alvo.dataOriginal,
                  tipo: "cancelada",
                })
              }
            >
              Cancelar só neste dia
            </Botao>
          )}
          {alvo.movida && (
            <Botao
              variante="secundario"
              largo
              disabled={ocupado}
              onClick={() =>
                executar("DELETE", `/api/eventos/${alvo.eventId}/excecoes/${alvo.dataOriginal}`)
              }
            >
              Voltar ao horário normal
            </Botao>
          )}
          <Botao variante="secundario" largo onClick={() => setModo("editar")} disabled={!evento}>
            Editar compromisso
          </Botao>
          <Botao variante="fantasma" largo onClick={() => setModo("apagar")}>
            Apagar compromisso
          </Botao>
        </div>
      )}

      {modo === "horario" && evento && (
        <form className={f.form} onSubmit={salvarHorario}>
          {alvo.recorrente && (
            <fieldset className={f.grupo}>
              <legend className={f.rotulo}>Aplicar em</legend>
              <div className={f.chips}>
                {(
                  [
                    ["dia", "Só neste dia"],
                    ["todos", "Todos os dias"],
                  ] as const
                ).map(([v, r]) => (
                  <label key={v} className={f.chipOpcao} data-area={alvo.areaId}>
                    <input
                      type="radio"
                      name="escopo"
                      checked={escopo === v}
                      onChange={() => setEscopo(v)}
                    />
                    <span>{r}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <div className={f.linha}>
            {(escopo === "dia" || !alvo.recorrente) && (
              <label className={f.campo}>
                <span className={f.rotulo}>Data</span>
                <input
                  type="date"
                  name="data"
                  required
                  defaultValue={inicio.data}
                  className={f.entrada}
                />
              </label>
            )}
            <label className={f.campo}>
              <span className={f.rotulo}>Início</span>
              <input
                type="time"
                name="inicio"
                required
                defaultValue={inicio.hora}
                className={`${f.entrada} mono`}
              />
            </label>
            <label className={f.campo}>
              <span className={f.rotulo}>Fim</span>
              <input
                type="time"
                name="fim"
                required
                defaultValue={fim.hora}
                className={`${f.entrada} mono`}
              />
            </label>
          </div>
          {escopo === "todos" && alvo.recorrente && (
            <p className={s.meta}>
              Muda o horário de todas as ocorrências. Mudanças feitas só num dia continuam valendo.
            </p>
          )}
          {erro && (
            <p className={f.erroGeral} role="alert">
              {erro}
            </p>
          )}
          {conflito && (
            <AvisoConflito
              detalhes={conflito.detalhes}
              ocupado={ocupado}
              aoConfirmar={conflito.repetir}
            />
          )}
          <div className={s.acoesLinha}>
            <Botao type="submit" disabled={ocupado}>
              {ocupado ? "Salvando..." : "Salvar horário"}
            </Botao>
            <Botao variante="fantasma" onClick={() => setModo("menu")}>
              Voltar
            </Botao>
          </div>
        </form>
      )}

      {modo === "editar" && evento && (
        <FormNovoItem
          disciplinas={disciplinas}
          editar={{ tipo: "evento", id: evento.id, valores: valoresDoEvento(evento) }}
          aoSalvar={fechar}
        />
      )}

      {modo === "apagar" && (
        <div className={s.acoes}>
          <p>
            Apagar <strong>{alvo.titulo}</strong>
            {alvo.recorrente ? " e todas as repetições" : ""}? Isso não pode ser desfeito.
          </p>
          <div className={s.acoesLinha}>
            <Botao
              disabled={ocupado}
              onClick={() => executar("DELETE", `/api/eventos/${alvo.eventId}`)}
            >
              Apagar
            </Botao>
            <Botao variante="fantasma" onClick={() => setModo("menu")}>
              Voltar
            </Botao>
          </div>
        </div>
      )}

      {modo === "menu" && erro && (
        <p className={f.erroGeral} role="alert">
          {erro}
        </p>
      )}
    </div>
  );
}
