"use client";

import type { EstadoAcervo } from "@/lib/cliente/cards";
import { trilhasETemas } from "@/lib/cards";
import { BotaoLink } from "../../ui/Botao";
import { Cartao } from "../../ui/Cartao";
import { EstadoVazio } from "../../ui/EstadoVazio";
import f from "../../shell/Form.module.css";
import s from "./Cards.module.css";

export type Filtro = { trilha: string; tema: string };

/** Selects de trilha e tema (o tema depende da trilha escolhida). Vazio = todos. */
export function FiltrosTrilhaTema({
  cards,
  valor,
  aoMudar,
}: {
  cards: { trilha: string; tema: string }[];
  valor: Filtro;
  aoMudar: (f: Filtro) => void;
}) {
  const grupos = trilhasETemas(cards);
  const temas = valor.trilha
    ? (grupos.find((g) => g.trilha === valor.trilha)?.temas ?? [])
    : [...new Set(grupos.flatMap((g) => g.temas))].sort((a, b) => a.localeCompare(b));
  return (
    <div className={s.filtros}>
      <label className={f.campo}>
        <span className={f.rotulo}>Trilha</span>
        <select
          className={f.entrada}
          value={valor.trilha}
          onChange={(e) => aoMudar({ trilha: e.target.value, tema: "" })}
        >
          <option value="">Todas</option>
          {grupos.map((g) => (
            <option key={g.trilha}>{g.trilha}</option>
          ))}
        </select>
      </label>
      <label className={f.campo}>
        <span className={f.rotulo}>Tema</span>
        <select
          className={f.entrada}
          value={valor.tema}
          onChange={(e) => aoMudar({ ...valor, tema: e.target.value })}
        >
          <option value="">Todos</option>
          {temas.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </label>
    </div>
  );
}

/** Enquanto a cópia local não existe: carregando, ou offline sem nunca ter baixado. */
export function AvisoAcervo({ estado }: { estado: EstadoAcervo }) {
  return (
    <Cartao>
      <EstadoVazio centro>
        {estado === "carregando"
          ? "Carregando os cards..."
          : "Os cards ainda não foram salvos neste aparelho. Abra esta tela uma vez com internet."}
      </EstadoVazio>
    </Cartao>
  );
}

export function AcervoVazio() {
  return (
    <Cartao>
      <EstadoVazio
        centro
        acao={
          <BotaoLink href="/cards/importar" variante="primario" pequeno>
            Importar cards
          </BotaoLink>
        }
      >
        Nenhum card no acervo ainda. Cole o JSON gerado nos seus chats de estudo.
      </EstadoVazio>
    </Cartao>
  );
}

export function nomeCaixa(c: { caixa: number; proximaEm: string | null }) {
  return c.proximaEm === null ? "Novo" : `Caixa ${c.caixa}`;
}
