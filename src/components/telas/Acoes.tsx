"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { enviar } from "@/lib/cliente/api";
import { hojeLocal } from "@/lib/tempo";
import { Botao } from "../ui/Botao";
import { CaixaSelecao } from "../ui/CaixaSelecao";
import { FolhaInferior } from "../ui/FolhaInferior";
import f from "../shell/Form.module.css";
import s from "../ui/Pagina.module.css";

/** Botão que abre uma folha com um formulário simples e envia para a API. */
function FolhaComForm({
  rotuloBotao,
  titulo,
  url,
  metodo = "POST",
  montar,
  children,
  textoSalvar,
  variante = "primario",
}: {
  rotuloBotao: string;
  titulo: string;
  url: string;
  metodo?: "POST" | "PUT";
  montar: (d: FormData) => Record<string, unknown>;
  children: ReactNode;
  textoSalvar: string;
  variante?: "primario" | "secundario";
}) {
  const router = useRouter();
  const [aberta, setAberta] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSalvando(true);
    const r = await enviar(metodo, url, montar(new FormData(e.currentTarget)));
    setSalvando(false);
    if (!r.ok) {
      const campo = r.campos && Object.values(r.campos)[0]?.[0];
      setErro(campo ? `${r.erro} ${campo}` : r.erro);
      return;
    }
    setErro(null);
    setAberta(false);
    router.refresh();
  }

  return (
    <>
      <Botao
        variante={variante}
        pequeno={variante === "secundario"}
        onClick={() => setAberta(true)}
      >
        {rotuloBotao}
      </Botao>
      <FolhaInferior aberta={aberta} aoFechar={() => setAberta(false)} titulo={titulo}>
        <form className={f.form} onSubmit={salvar}>
          {children}
          {erro && (
            <p className={f.erroGeral} role="alert">
              {erro}
            </p>
          )}
          <Botao type="submit" largo disabled={salvando}>
            {salvando ? "Salvando..." : textoSalvar}
          </Botao>
        </form>
      </FolhaInferior>
    </>
  );
}

function Campo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <label className={f.campo}>
      <span className={f.rotulo}>{rotulo}</span>
      {children}
    </label>
  );
}

const txt = (d: FormData, k: string) => String(d.get(k) ?? "").trim();

export function NovaDisciplina() {
  return (
    <FolhaComForm
      rotuloBotao="Nova disciplina"
      titulo="Nova disciplina"
      url="/api/disciplinas"
      textoSalvar="Salvar disciplina"
      montar={(d) => ({
        nome: txt(d, "nome"),
        sigla: txt(d, "sigla"),
        professor: txt(d, "professor"),
        sala: txt(d, "sala"),
        limiteFaltas: Number(txt(d, "limite") || 0),
      })}
    >
      <Campo rotulo="Nome">
        <input name="nome" required maxLength={120} className={f.entrada} autoComplete="off" />
      </Campo>
      <div className={f.linha}>
        <Campo rotulo="Sigla">
          <input name="sigla" required maxLength={12} className={f.entrada} autoComplete="off" />
        </Campo>
        <Campo rotulo="Limite de faltas">
          <input
            name="limite"
            type="number"
            min={0}
            max={200}
            defaultValue={0}
            className={`${f.entrada} mono`}
          />
        </Campo>
      </div>
      <Campo rotulo="Professor (opcional)">
        <input name="professor" maxLength={120} className={f.entrada} autoComplete="off" />
      </Campo>
      <Campo rotulo="Sala (opcional)">
        <input name="sala" maxLength={60} className={f.entrada} autoComplete="off" />
      </Campo>
    </FolhaComForm>
  );
}

export function RegistrarFalta({ disciplinaId }: { disciplinaId: string }) {
  return (
    <FolhaComForm
      rotuloBotao="Registrar falta"
      titulo="Registrar falta"
      url={`/api/disciplinas/${disciplinaId}/faltas`}
      textoSalvar="Registrar"
      variante="secundario"
      montar={(d) => ({ data: txt(d, "data"), quantidade: Number(txt(d, "qtd") || 1) })}
    >
      <div className={f.linha}>
        <Campo rotulo="Data">
          <input
            name="data"
            type="date"
            required
            defaultValue={hojeLocal()}
            className={f.entrada}
          />
        </Campo>
        <Campo rotulo="Aulas perdidas">
          <input
            name="qtd"
            type="number"
            min={1}
            max={10}
            defaultValue={1}
            className={`${f.entrada} mono`}
          />
        </Campo>
      </div>
    </FolhaComForm>
  );
}

export function NovoLembrete() {
  return (
    <FolhaComForm
      rotuloBotao="Novo lembrete"
      titulo="Novo lembrete"
      url="/api/lembretes"
      textoSalvar="Salvar lembrete"
      montar={(d) => ({
        texto: txt(d, "texto"),
        data: txt(d, "data"),
        hora: txt(d, "hora"),
        repetir: txt(d, "repetir"),
      })}
    >
      <Campo rotulo="Lembrar de">
        <input name="texto" required maxLength={200} className={f.entrada} autoComplete="off" />
      </Campo>
      <div className={f.linha}>
        <Campo rotulo="Data">
          <input
            name="data"
            type="date"
            required
            defaultValue={hojeLocal()}
            className={f.entrada}
          />
        </Campo>
        <Campo rotulo="Hora">
          <input
            name="hora"
            type="time"
            required
            defaultValue="09:00"
            className={`${f.entrada} mono`}
          />
        </Campo>
      </div>
      <Campo rotulo="Repetir">
        <select name="repetir" className={f.entrada} defaultValue="nunca">
          <option value="nunca">Não repete</option>
          <option value="diario">Todo dia</option>
          <option value="semanal">Toda semana</option>
          <option value="mensal">Todo mês</option>
        </select>
      </Campo>
    </FolhaComForm>
  );
}

export function Checklist({
  avaliacaoId,
  itens,
}: {
  avaliacaoId: string;
  itens: { id: string; texto: string; feito: boolean }[];
}) {
  const router = useRouter();
  const [, iniciar] = useTransition();
  const [novo, setNovo] = useState("");

  async function adicionar(e: FormEvent) {
    e.preventDefault();
    if (!novo.trim()) return;
    await enviar("POST", `/api/avaliacoes/${avaliacaoId}/checklist`, {
      texto: novo,
      posicao: itens.length,
    });
    setNovo("");
    router.refresh();
  }

  return (
    <div className={s.pilha}>
      {itens.length ? (
        <ul className={s.lista}>
          {itens.map((i) => (
            <li key={i.id}>
              <CaixaSelecao
                defaultChecked={i.feito}
                onChange={(e) =>
                  iniciar(async () => {
                    await enviar("PATCH", `/api/checklist/${i.id}`, { feito: e.target.checked });
                    router.refresh();
                  })
                }
              >
                {i.texto}
              </CaixaSelecao>
            </li>
          ))}
        </ul>
      ) : (
        <p className={s.meta}>Nenhum item de preparação ainda.</p>
      )}
      <form onSubmit={adicionar} className={f.linhaBotao}>
        <label className={f.campo}>
          <span className="sr-only">Novo item de preparação</span>
          <input
            value={novo}
            onChange={(e) => setNovo(e.target.value)}
            placeholder="Ex.: Refazer a lista 2"
            maxLength={200}
            className={f.entrada}
          />
        </label>
        <Botao type="submit" variante="secundario">
          Adicionar
        </Botao>
      </form>
    </div>
  );
}

export function ConcluirAvaliacao({ id, concluida }: { id: string; concluida: boolean }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  return (
    <Botao
      variante={concluida ? "secundario" : "primario"}
      disabled={ocupado}
      onClick={async () => {
        setOcupado(true);
        await enviar("PATCH", `/api/avaliacoes/${id}`, { concluida: !concluida });
        setOcupado(false);
        router.refresh();
      }}
    >
      {concluida ? "Reabrir" : "Concluir"}
    </Botao>
  );
}
