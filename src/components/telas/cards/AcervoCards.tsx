"use client";

import { useState, type FormEvent } from "react";
import type { CardCliente } from "@/lib/cards";
import { useAcervo } from "@/lib/cliente/cards";
import { origensCard } from "@/lib/dominio";
import { dataCurta } from "@/lib/tempo";
import { cardEdicaoSchema } from "@/lib/validacao";
import { Botao } from "../../ui/Botao";
import { Cartao, CartaoCabeca } from "../../ui/Cartao";
import { EstadoVazio } from "../../ui/EstadoVazio";
import { FolhaInferior } from "../../ui/FolhaInferior";
import { layout } from "../../ui/Pagina";
import f from "../../shell/Form.module.css";
import { AcervoVazio, AvisoAcervo, FiltrosTrilhaTema, nomeCaixa, type Filtro } from "./comum";
import s from "./Cards.module.css";

type Situacao = "todos" | "novos" | "suspensos";
const POR_PAGINA = 100;

/** Tela /cards/acervo: todos os cards salvos, com filtros, edição, suspensão e exclusão. */
export function AcervoCards() {
  const { dados, estado, editar, apagar } = useAcervo();
  const [filtro, setFiltro] = useState<Filtro>({ trilha: "", tema: "" });
  const [situacao, setSituacao] = useState<Situacao>("todos");
  const [busca, setBusca] = useState("");
  const [mostrar, setMostrar] = useState(POR_PAGINA);
  const [abertoId, setAbertoId] = useState<string | null>(null);

  if (!dados) return <AvisoAcervo estado={estado} />;
  if (!dados.cards.length) return <AcervoVazio />;

  const termo = busca.trim().toLocaleLowerCase("pt-BR");
  const lista = dados.cards
    .filter(
      (c) =>
        (!filtro.trilha || c.trilha === filtro.trilha) &&
        (!filtro.tema || c.tema === filtro.tema) &&
        (situacao === "todos" || (situacao === "novos" ? c.proximaEm === null : c.suspenso)) &&
        (!termo || `${c.chave} ${c.frente} ${c.verso}`.toLocaleLowerCase("pt-BR").includes(termo)),
    )
    .sort(
      (a, b) =>
        a.trilha.localeCompare(b.trilha) ||
        a.tema.localeCompare(b.tema) ||
        a.chave.localeCompare(b.chave),
    );
  const aberto = dados.cards.find((c) => c.id === abertoId) ?? null;

  return (
    <Cartao>
      <CartaoCabeca
        titulo="Acervo"
        acao={
          <span className="mono">
            {lista.length === dados.cards.length
              ? dados.cards.length
              : `${lista.length} de ${dados.cards.length}`}
          </span>
        }
      />
      <FiltrosTrilhaTema cards={dados.cards} valor={filtro} aoMudar={setFiltro} />
      <div className={s.filtros}>
        <label className={f.campo}>
          <span className={f.rotulo}>Situação</span>
          <select
            className={f.entrada}
            value={situacao}
            onChange={(e) => setSituacao(e.target.value as Situacao)}
          >
            <option value="todos">Todos</option>
            <option value="novos">Novos</option>
            <option value="suspensos">Suspensos</option>
          </select>
        </label>
        <label className={f.campo}>
          <span className={f.rotulo}>Buscar</span>
          <input
            type="search"
            className={f.entrada}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Id, frente ou verso"
          />
        </label>
      </div>
      {lista.length ? (
        <ul className={layout.lista}>
          {lista.slice(0, mostrar).map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className={`${s.item} ${c.suspenso ? s.itemSuspenso : ""}`}
                onClick={() => setAbertoId(c.id)}
              >
                <span className={s.itemFrente}>{c.frente}</span>
                <span className={layout.meta}>
                  <span className="mono">{c.chave}</span> · {c.tema} · {situacaoDe(c)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <EstadoVazio>Nenhum card com esses filtros.</EstadoVazio>
      )}
      {lista.length > mostrar && (
        <Botao
          variante="secundario"
          pequeno
          className={s.mais}
          onClick={() => setMostrar((n) => n + POR_PAGINA)}
        >
          Mostrar mais {Math.min(POR_PAGINA, lista.length - mostrar)}
        </Botao>
      )}
      <FolhaInferior
        aberta={!!aberto}
        aoFechar={() => setAbertoId(null)}
        titulo={aberto ? aberto.chave : "Card"}
      >
        {aberto && (
          <EditarCard
            key={aberto.id}
            card={aberto}
            editar={editar}
            apagar={async (id) => {
              const r = await apagar(id);
              if (r.ok) setAbertoId(null);
              return r;
            }}
          />
        )}
      </FolhaInferior>
    </Cartao>
  );
}

function situacaoDe(c: CardCliente) {
  const partes = [nomeCaixa(c)];
  if (c.proximaEm) partes.push(`revisa ${dataCurta(c.proximaEm)}`);
  if (c.suspenso) partes.push("suspenso");
  return partes.join(" · ");
}

type Retorno = { ok: boolean; erro?: string; enfileirado?: boolean };

function EditarCard({
  card,
  editar,
  apagar,
}: {
  card: CardCliente;
  editar: (card: CardCliente, mudancas: Partial<CardCliente>) => Promise<Retorno>;
  apagar: (id: string) => Promise<Retorno>;
}) {
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [confirmarApagar, setConfirmarApagar] = useState(false);

  function avisar(r: Retorno, feito: string) {
    setMsg(
      r.ok
        ? {
            ok: true,
            texto: r.enfileirado ? "Salvo no aparelho. Sincroniza quando a conexão voltar." : feito,
          }
        : { ok: false, texto: r.erro ?? "Não foi possível salvar." },
    );
  }

  async function salvar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const v = cardEdicaoSchema.safeParse({
      trilha: d.get("trilha"),
      tema: d.get("tema"),
      frente: d.get("frente"),
      verso: d.get("verso"),
      codigo: d.get("codigo"),
      origem: d.get("origem"),
    });
    if (!v.success) {
      const i = v.error.issues[0];
      setMsg({ ok: false, texto: `${i.path.join(".")}: ${i.message}` });
      return;
    }
    setSalvando(true);
    avisar(await editar(card, v.data as Partial<CardCliente>), "Card salvo.");
    setSalvando(false);
  }

  return (
    <form className={f.form} onSubmit={salvar}>
      <p className={layout.meta}>
        {situacaoDe(card)} · {card.acertos} acertos · {card.erros} erros
      </p>
      <div className={f.linha}>
        <label className={f.campo}>
          <span className={f.rotulo}>Trilha</span>
          <input name="trilha" defaultValue={card.trilha} className={f.entrada} required />
        </label>
        <label className={f.campo}>
          <span className={f.rotulo}>Tema</span>
          <input name="tema" defaultValue={card.tema} className={f.entrada} required />
        </label>
      </div>
      <label className={f.campo}>
        <span className={f.rotulo}>Frente</span>
        <textarea
          name="frente"
          defaultValue={card.frente}
          rows={3}
          className={f.entrada}
          required
        />
      </label>
      <label className={f.campo}>
        <span className={f.rotulo}>Verso</span>
        <textarea name="verso" defaultValue={card.verso} rows={4} className={f.entrada} required />
      </label>
      <label className={f.campo}>
        <span className={f.rotulo}>Código (opcional)</span>
        <textarea
          name="codigo"
          defaultValue={card.codigo ?? ""}
          rows={4}
          wrap="off"
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          className={`${f.entrada} ${s.areaCodigo}`}
        />
      </label>
      <label className={f.campo}>
        <span className={f.rotulo}>Origem</span>
        <select name="origem" defaultValue={card.origem} className={f.entrada}>
          {origensCard.map((o) => (
            <option key={o} value={o}>
              {o === "aula" ? "Aula" : "Caderno de erros"}
            </option>
          ))}
        </select>
      </label>
      {msg && (
        <p className={msg.ok ? layout.meta : f.erroGeral} role="status">
          {msg.texto}
        </p>
      )}
      <div className={s.acoesFolha}>
        <Botao type="submit" disabled={salvando}>
          {salvando ? "Salvando..." : "Salvar"}
        </Botao>
        <Botao
          variante="secundario"
          onClick={async () =>
            avisar(
              await editar(card, { suspenso: !card.suspenso }),
              card.suspenso ? "Card reativado." : "Card suspenso: fica fora das sessões.",
            )
          }
        >
          {card.suspenso ? "Reativar" : "Suspender"}
        </Botao>
        {confirmarApagar ? (
          <Botao
            variante="secundario"
            className={s.perigo}
            onClick={async () => avisar(await apagar(card.id), "Card apagado.")}
          >
            Apagar de vez
          </Botao>
        ) : (
          <Botao variante="fantasma" className={s.perigo} onClick={() => setConfirmarApagar(true)}>
            Apagar
          </Botao>
        )}
      </div>
    </form>
  );
}
