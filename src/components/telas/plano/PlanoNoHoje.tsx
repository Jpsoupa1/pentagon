"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Botao, BotaoLink } from "@/components/ui/Botao";
import { Cartao, CartaoCabeca } from "@/components/ui/Cartao";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { enviar } from "@/lib/cliente/api";
import { AnotarErro } from "../AnotarErro";
import { RevisaoEspacada } from "../RevisaoEspacada";
import { duracaoTexto, minParaHm, hmParaMin } from "@/lib/tempo";
import type { PlanoDeHoje } from "@/server/servicos/blocos";
import s from "./PlanoNoHoje.module.css";

type Plano = Extract<PlanoDeHoje, { iniciado: true }>;
type BlocoHoje = Plano["blocos"][number];

const RESPOSTAS_DA_FOLGA = [
  { minutos: 0, rotulo: "Nada" },
  { minutos: 60, rotulo: "1 h" },
  { minutos: 120, rotulo: "2 h" },
  { minutos: 180, rotulo: "3 h" },
];

/**
 * A folga e os blocos do dia no Hoje. O servidor decide o que existe e o que cada bloco mostra;
 * aqui só se chamam as rotas do plano (sem fila offline) e se relê a página depois de cada uma.
 */
export function PlanoNoHoje({ plano }: { plano: Plano }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  /** Uma escrita por vez: o clique repetido não chega ao servidor. */
  const emCurso = useRef(false);

  async function escrever(url: string, corpo: unknown) {
    if (emCurso.current) return;
    emCurso.current = true;
    setOcupado(true);
    setAviso(null);
    const r = await enviar("PUT", url, corpo, { semFila: true });
    if (r.ok) router.refresh();
    else setAviso(r.erro);
    emCurso.current = false;
    setOcupado(false);
  }

  return (
    <>
      {plano.perguntarFolga && (
        <Cartao aria-labelledby="folga-titulo">
          <CartaoCabeca titulo={<span id="folga-titulo">Hoje tem folga no estágio?</span>} />
          <div role="group" aria-labelledby="folga-titulo" className={s.respostas}>
            {RESPOSTAS_DA_FOLGA.map((r) => (
              <Botao
                key={r.minutos}
                variante={plano.folga === r.minutos ? "primario" : "secundario"}
                aria-pressed={plano.folga === r.minutos}
                disabled={ocupado}
                onClick={() => escrever("/api/plano/folga", { minutos: r.minutos })}
              >
                {r.rotulo}
              </Botao>
            ))}
          </div>
        </Cartao>
      )}
      <Cartao aria-labelledby="blocos-titulo">
        <CartaoCabeca titulo={<span id="blocos-titulo">Blocos de hoje</span>} />
        {aviso && (
          <p role="alert" className={s.aviso}>
            {aviso}
          </p>
        )}
        {plano.blocos.length ? (
          <ul className={s.lista}>
            {plano.blocos.map((b) => (
              <LinhaDoBloco
                // Muda quando o servidor devolve outro estado e recomeça os campos do bloco.
                key={`${b.bloco}:${b.feito}:${b.minutosFeitos}:${b.minutos}`}
                bloco={b}
                hoje={plano.hoje}
                opcoes={plano.opcoesDeTroca}
                ocupado={ocupado}
                escrever={escrever}
              />
            ))}
          </ul>
        ) : (
          <EstadoVazio>Nenhum bloco de estudo hoje.</EstadoVazio>
        )}
      </Cartao>
      {plano.cardsECerebro && <CartaoCardsECerebro material={plano.cardsECerebro} />}
    </>
  );
}

/** Plano B do dia: revisão de cards, erros do caderno já vencidos e o lembrete do Cerebro. */
function CartaoCardsECerebro({ material }: { material: NonNullable<Plano["cardsECerebro"]> }) {
  const { cards, erros } = material;
  return (
    <Cartao aria-labelledby="cards-e-cerebro-titulo">
      <CartaoCabeca titulo={<span id="cards-e-cerebro-titulo">Cards e Cerebro</span>} />
      <ul className={s.lista}>
        <li className={s.bloco}>
          <p className={s.titulo}>
            <strong>Revisão de cards do dia:</strong>{" "}
            {cards.faltam === 0
              ? "tudo revisado por hoje."
              : `${cards.faltam} ${cards.faltam === 1 ? "card falta" : "cards faltam"} revisar.`}
          </p>
          {cards.faltam > 0 && (
            <div className={s.acoes}>
              <BotaoLink href="/cards/dia" variante="fantasma" pequeno>
                Começar os cards
              </BotaoLink>
            </div>
          )}
        </li>
        <li className={s.bloco}>
          <p className={s.titulo}>
            <strong>Erros para revisar ({erros.length})</strong>
          </p>
          {erros.length > 0 && <RevisaoEspacada erros={erros} />}
        </li>
        <li className={s.bloco}>
          <p className={s.titulo}>Passar as notas no Cerebro</p>
        </li>
      </ul>
    </Cartao>
  );
}

function LinhaDoBloco({
  bloco,
  hoje,
  opcoes,
  ocupado,
  escrever,
}: {
  bloco: BlocoHoje;
  hoje: string;
  opcoes: Plano["opcoesDeTroca"];
  ocupado: boolean;
  escrever: (url: string, corpo: unknown) => Promise<void>;
}) {
  const [minutos, setMinutos] = useState(String(bloco.minutosFeitos ?? bloco.minutos));
  const [trocando, setTrocando] = useState(false);
  const url = `/api/plano/blocos/${bloco.bloco}`;
  const fim = minParaHm(hmParaMin(bloco.inicio) + bloco.minutos);
  const valido =
    Number.isInteger(Number(minutos)) && Number(minutos) >= 1 && Number(minutos) <= 240;

  async function trocar(escolha: string | null) {
    setTrocando(false);
    await escrever(`${url}/troca`, { escolha });
  }

  return (
    <li className={s.bloco} data-feito={bloco.feito}>
      <p className={`${s.horario} mono`}>
        {bloco.inicio} a {fim}
      </p>
      <p className={s.titulo}>
        <strong>{bloco.rotulo}:</strong> {bloco.texto}
      </p>
      <div className={s.acoes}>
        <BotaoLink href={bloco.destino} variante="fantasma" pequeno>
          Abrir<span className="sr-only"> {bloco.rotulo}</span>
        </BotaoLink>
        {bloco.feito ? (
          <>
            <span className={s.feito}>Feito, {duracaoTexto(bloco.minutosFeitos ?? 0)}</span>
            <Botao
              variante="secundario"
              pequeno
              disabled={ocupado}
              onClick={() => escrever(url, { feito: false })}
            >
              Desmarcar<span className="sr-only"> {bloco.rotulo}</span>
            </Botao>
          </>
        ) : (
          <>
            <label className={s.minutos}>
              <span className="sr-only">Minutos do bloco {bloco.rotulo}</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={240}
                value={minutos}
                onChange={(e) => setMinutos(e.target.value)}
                className={`${s.entrada} mono`}
              />
              <span aria-hidden>min</span>
            </label>
            <Botao
              pequeno
              aria-label={`Fiz este bloco: ${bloco.rotulo}`}
              disabled={ocupado || !valido}
              onClick={() => escrever(url, { feito: true, minutos: Number(minutos) })}
            >
              Fiz este bloco
            </Botao>
            <Botao
              variante="secundario"
              pequeno
              aria-expanded={trocando}
              disabled={ocupado}
              onClick={() => setTrocando((t) => !t)}
            >
              Trocar<span className="sr-only"> o conteúdo de {bloco.rotulo}</span>
            </Botao>
          </>
        )}
        <AnotarErro
          variante="secundario"
          padrao={{ data: hoje, tema: bloco.texto.slice(0, 120), origem: "pratica" }}
        />
      </div>
      {trocando && !bloco.feito && (
        <div role="group" aria-label={`Trocar o conteúdo de ${bloco.rotulo}`} className={s.opcoes}>
          {opcoes.map((o) => (
            <Botao
              key={o.valor}
              variante="fantasma"
              pequeno
              disabled={ocupado}
              onClick={() => trocar(o.valor)}
            >
              {o.texto}
            </Botao>
          ))}
          <Botao variante="fantasma" pequeno disabled={ocupado} onClick={() => trocar(null)}>
            Voltar ao que o plano manda
          </Botao>
        </div>
      )}
    </li>
  );
}
