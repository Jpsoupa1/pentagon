"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  LIMITE_TEXTO_PEDIDO,
  MENSAGEM_FORA_DO_ESCOPO,
  MENSAGEM_PARTE_IGNORADA,
  MENSAGEM_SEM_CREDITOS,
  ROTULO_DA_ACAO,
  SUGESTOES_DE_PEDIDO,
  type AcaoVisivel,
  type ExecucaoVisivel,
} from "@/lib/assistente";
import { AREA_POR_ID } from "@/lib/areas";
import { DIAS_CURTOS, MESES, partesLocais } from "@/lib/tempo";
import { pontos, verticesPentagono } from "@/components/ui/geometria";
import { AREAS } from "@/lib/areas";
import { useReconhecimento, vozDisponivel } from "./reconhecimento";
import s from "./ModoVoz.module.css";

type Fase =
  | { nome: "pronto" }
  | { nome: "ouvindo" }
  | { nome: "digitando" }
  | { nome: "pensando"; texto: string }
  | { nome: "resultado"; execucao: ExecucaoVisivel; avisos: string[] }
  | { nome: "erro"; texto: string; mensagem: string };

/** GET sem corpo; POST com corpo. A API do assistente nunca entra na fila offline. */
async function chamar<T>(url: string, corpo?: unknown): Promise<T> {
  const r = await fetch(url, {
    method: corpo === undefined ? "GET" : "POST",
    headers: corpo === undefined ? undefined : { "Content-Type": "application/json" },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  if (r.status === 204) return undefined as T;
  const json = await r.json().catch(() => ({}));
  if (!r.ok) {
    const erro = new Error(json.erro ?? "Não foi possível falar com o assistente.");
    (erro as Error & { codigo?: string }).codigo = json.codigo;
    throw erro;
  }
  return json as T;
}

const assinarMinuto = (avisar: () => void) => {
  const t = setInterval(avisar, 15_000);
  return () => clearInterval(t);
};
const minutoAtual = () => Math.floor(Date.now() / 60_000);
const nada = () => () => {};

function Relogio({ fuso }: { fuso: string }) {
  const minuto = useSyncExternalStore(assinarMinuto, minutoAtual, () => null);
  if (minuto === null) return <span className={s.relogio}>&nbsp;</span>;
  const agora = new Date(minuto * 60_000);
  const p = partesLocais(agora, fuso);
  const [, m, d] = p.data.split("-").map(Number);
  return (
    <time className={s.relogio} dateTime={agora.toISOString()}>
      {`${DIAS_CURTOS[p.diaSemana]}, ${d} ${MESES[m - 1].slice(0, 3)} · ${p.hora}`.toUpperCase()}
    </time>
  );
}

const Svg = ({ children, tamanho = 22 }: { children: ReactNode; tamanho?: number }) => (
  <svg
    width={tamanho}
    height={tamanho}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    {children}
  </svg>
);
const IconeFechar = () => (
  <Svg>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);
const IconeMicrofone = ({ tamanho = 40 }: { tamanho?: number }) => (
  <Svg tamanho={tamanho}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
  </Svg>
);
const IconeCheck = () => (
  <Svg tamanho={18}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Svg>
);

/** Pentágono com cada lado na cor de uma área e o microfone no centro. */
function Pentagono({ children }: { children: ReactNode }) {
  const v = verticesPentagono(115, 118, 104);
  return (
    <div className={s.pentagono}>
      <svg viewBox="0 0 230 230" width={230} height={230} aria-hidden className={s.pentagonoSvg}>
        <polygon points={pontos(v)} className={s.pentagonoFundo} />
        {v.map(([x, y], i) => {
          const [x2, y2] = v[(i + 1) % 5];
          return (
            <line
              key={AREAS[i].id}
              x1={x}
              y1={y}
              x2={x2}
              y2={y2}
              stroke={AREAS[i].cor}
              strokeWidth={4}
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      {children}
    </div>
  );
}

function Onda() {
  return (
    <div className={s.onda} aria-hidden>
      {Array.from({ length: 24 }, (_, i) => (
        <span key={i} style={{ animationDelay: `${(i % 6) * 0.11}s` }} />
      ))}
    </div>
  );
}

function Sugestoes({ aoEscolher }: { aoEscolher: (t: string) => void }) {
  return (
    <ul className={s.sugestoes}>
      {SUGESTOES_DE_PEDIDO.map((t) => (
        <li key={t}>
          <button type="button" className={s.sugestao} onClick={() => aoEscolher(t)}>
            “{t}”
          </button>
        </li>
      ))}
    </ul>
  );
}

function VocePediu({ texto }: { texto: string }) {
  return (
    <section className={s.pedido} aria-label="Você pediu">
      <h2 className={s.rotulo}>Você pediu</h2>
      <p>“{texto}”</p>
    </section>
  );
}

function ChipArea({ areaId }: { areaId: AcaoVisivel["areaId"] }) {
  const area = areaId ? AREA_POR_ID[areaId] : null;
  return (
    <span className={s.chip}>
      <span className={s.ponto} style={{ background: area?.cor ?? "#9AA0AD" }} />
      {area?.curto ?? "Lembrete"}
    </span>
  );
}

function CartaoAcao({
  acao,
  ocupado,
  aoAgir,
}: {
  acao: AcaoVisivel;
  ocupado: boolean;
  aoAgir: (acao: AcaoVisivel, o: "desfazer" | "confirmar" | "mover" | "manter") => void;
}) {
  const inativa = acao.status === "desfeita" || acao.status === "descartada";
  const proposta = acao.status === "proposta";
  return (
    <>
      <article className={s.acao} data-inativa={inativa || undefined} aria-label={acao.titulo}>
        <div className={s.acaoTopo}>
          <span className={s.tipo} data-tipo={acao.tipo}>
            {proposta ? "APAGAR?" : ROTULO_DA_ACAO[acao.tipo]}
          </span>
          <ChipArea areaId={acao.areaId} />
          <span className={s.acaoBotoes}>
            {acao.status === "feita" && (
              <button
                type="button"
                className={s.desfazer}
                disabled={ocupado}
                onClick={() => aoAgir(acao, "desfazer")}
              >
                Desfazer
              </button>
            )}
            {acao.status === "desfeita" && <span className={s.estado}>Desfeito</span>}
            {acao.status === "descartada" && <span className={s.estado}>Mantido</span>}
          </span>
        </div>
        <h3 className={s.acaoTitulo}>{acao.titulo}</h3>
        {acao.campos.map((c) => (
          <p key={c.rotulo} className={s.campo}>
            <span className={s.campoRotulo}>{c.rotulo}</span>
            {c.antes && <del className={s.antes}>{c.antes}</del>}
            {c.antes && c.depois && <span aria-hidden> → </span>}
            {c.depois && <span className={s.depois}>{c.depois}</span>}
          </p>
        ))}
        {proposta && (
          <div className={s.linhaBotoes}>
            <button
              type="button"
              className={s.perigo}
              disabled={ocupado}
              onClick={() => aoAgir(acao, "confirmar")}
            >
              Confirmar
            </button>
            <button
              type="button"
              className={s.fantasma}
              disabled={ocupado}
              onClick={() => aoAgir(acao, "desfazer")}
            >
              Não apagar
            </button>
          </div>
        )}
      </article>
      {acao.status === "feita" &&
        acao.conflitos.map((c, i) => (
          <aside key={i} className={s.conflito} aria-label="Conflito de horário">
            <h3>Choque de horário</h3>
            <p>
              Não mexi em <strong>{c.titulo}</strong> ({c.horario}): continua no mesmo horário e
              agora coincide com {acao.titulo}.
            </p>
            {acao.conflitoDecisao ? (
              <p className={s.decisao}>
                {acao.conflitoDecisao === "movido"
                  ? "Resolvido: movi como você pediu (veja abaixo)."
                  : "Ficou assim, como você escolheu."}
              </p>
            ) : (
              i === 0 && (
                <div className={s.linhaBotoes}>
                  {c.correcao && (
                    <button
                      type="button"
                      className={s.laranja}
                      disabled={ocupado}
                      onClick={() => aoAgir(acao, "mover")}
                    >
                      {c.correcao}
                    </button>
                  )}
                  <button
                    type="button"
                    className={s.fantasma}
                    disabled={ocupado}
                    onClick={() => aoAgir(acao, "manter")}
                  >
                    Deixar assim
                  </button>
                </div>
              )
            )}
          </aside>
        ))}
    </>
  );
}

function tituloDoResultado(e: ExecucaoVisivel) {
  const feitas = e.acoes.filter((a) => a.status === "feita" || a.status === "desfeita").length;
  const propostas = e.acoes.filter((a) => a.status === "proposta").length;
  if (feitas) return `Pronto. Fiz ${feitas} ${feitas === 1 ? "alteração" : "alterações"}.`;
  if (propostas) return "Preciso da sua confirmação.";
  return "Não consegui fazer isso.";
}

export function ModoVoz({
  fuso,
  textoInicial,
  execucaoInicial,
}: {
  fuso: string;
  textoInicial: string | null;
  execucaoInicial: ExecucaoVisivel | null;
}) {
  const [fase, setFase] = useState<Fase>(
    execucaoInicial
      ? { nome: "resultado", execucao: execucaoInicial, avisos: [] }
      : { nome: "pronto" },
  );
  const [rascunho, setRascunho] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  // Só no navegador dá para saber se há reconhecimento de fala (no servidor, presume que não).
  const comVoz = useSyncExternalStore(nada, vozDisponivel, () => false);
  const campo = useRef<HTMLTextAreaElement>(null);

  const enviar = useCallback(async (texto: string) => {
    const t = texto.trim();
    if (!t) return setFase({ nome: "pronto" });
    setFase({ nome: "pensando", texto: t });
    try {
      const execucao = await chamar<ExecucaoVisivel>("/api/assistente", { texto: t });
      setFase({ nome: "resultado", execucao, avisos: [] });
      setRascunho("");
      // Recarregar a página mostra o mesmo resultado, sem refazer o pedido.
      window.history.replaceState(null, "", `/voz?execucao=${execucao.id}`);
    } catch (e) {
      const codigo = (e as { codigo?: string }).codigo;
      setFase({
        nome: "erro",
        texto: t,
        mensagem: codigo === "sem_creditos" ? MENSAGEM_SEM_CREDITOS : (e as Error).message,
      });
    }
  }, []);

  const escuta = useReconhecimento(
    useCallback((t: string) => (t ? enviar(t) : setFase({ nome: "pronto" })), [enviar]),
    useCallback((motivo: string) => {
      setAviso(
        motivo === "not-allowed" || motivo === "service-not-allowed"
          ? "Sem acesso ao microfone. Use o ditado do teclado."
          : "Não deu para ouvir aqui. Use o ditado do teclado.",
      );
      setFase({ nome: "digitando" });
    }, []),
  );

  // Atalho da tela bloqueada: chega com o texto já ditado pelo iOS e envia na hora.
  const jaEnviou = useRef(false);
  useEffect(() => {
    if (!textoInicial || jaEnviou.current) return;
    jaEnviou.current = true;
    window.history.replaceState(null, "", "/voz");
    void enviar(textoInicial);
  }, [textoInicial, enviar]);

  useEffect(() => {
    if (fase.nome === "digitando") campo.current?.focus();
  }, [fase.nome]);

  function falar() {
    setAviso(null);
    if (comVoz) {
      setFase({ nome: "ouvindo" });
      escuta.ouvir();
    } else {
      setFase({ nome: "digitando" });
    }
  }

  async function agir(acao: AcaoVisivel, o: "desfazer" | "confirmar" | "mover" | "manter") {
    if (fase.nome !== "resultado") return;
    setOcupado(true);
    setAviso(null);
    try {
      if (o === "mover" || o === "manter")
        await chamar(`/api/assistente/acoes/${acao.id}/conflito`, { decisao: o });
      else await chamar(`/api/assistente/acoes/${acao.id}/${o}`, {});
      const execucao = await chamar<ExecucaoVisivel>(
        `/api/assistente/execucoes/${fase.execucao.id}`,
      );
      setFase({ nome: "resultado", execucao, avisos: [] });
    } catch (e) {
      setAviso((e as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  async function desfazerTudo() {
    if (fase.nome !== "resultado") return;
    setOcupado(true);
    try {
      const r = await chamar<{ avisos: string[]; execucao: ExecucaoVisivel }>(
        `/api/assistente/execucoes/${fase.execucao.id}/desfazer`,
        {},
      );
      setFase({ nome: "resultado", execucao: r.execucao, avisos: r.avisos });
    } catch (e) {
      setAviso((e as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  const fechar = (
    <Link href="/" className={s.redondo} aria-label="Fechar e voltar para Hoje">
      <IconeFechar />
    </Link>
  );

  // ---------------------------------------------------------------- Resultado

  if (fase.nome === "resultado") {
    const e = fase.execucao;
    const podeDesfazer = e.acoes.some((a) => a.status === "feita" || a.status === "proposta");
    return (
      <div className={s.tela}>
        <header className={s.topo}>
          {fechar}
          {e.tipo === "acoes" && podeDesfazer && (
            <button
              type="button"
              className={s.desfazerTudo}
              disabled={ocupado}
              onClick={desfazerTudo}
            >
              Desfazer tudo
            </button>
          )}
        </header>
        <main className={s.conteudo}>
          {e.tipo === "fora_do_escopo" ? (
            <>
              <h1 className={s.titulo}>Isso eu não faço.</h1>
              <VocePediu texto={e.texto} />
              <p className={s.recusa}>{MENSAGEM_FORA_DO_ESCOPO}</p>
              <h2 className={s.rotulo}>Experimente</h2>
              <Sugestoes aoEscolher={enviar} />
            </>
          ) : e.tipo === "consulta" && e.consulta ? (
            <>
              <h1 className={s.titulo}>{e.consulta.titulo}</h1>
              <VocePediu texto={e.texto} />
              {e.consulta.itens.length ? (
                <ul className={s.lista}>
                  {e.consulta.itens.map((i) => (
                    <li key={i.chave} className={s.itemConsulta} data-feito={i.feito || undefined}>
                      <span
                        className={s.ponto}
                        style={{ background: i.areaId ? AREA_POR_ID[i.areaId].cor : "#9AA0AD" }}
                      />
                      <span className={s.itemTexto}>
                        <strong>{i.titulo}</strong>
                        <span className={s.mono}>{i.quando}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={s.recusa}>Nada na agenda nesse período.</p>
              )}
            </>
          ) : (
            <>
              <h1 className={s.titulo}>
                {e.acoes.some((a) => a.status === "feita" || a.status === "desfeita") && (
                  <span className={s.ok}>
                    <IconeCheck />
                  </span>
                )}
                {e.tipo === "erro" && !e.acoes.length
                  ? "Não entendi o pedido."
                  : tituloDoResultado(e)}
              </h1>
              <VocePediu texto={e.texto} />
              {e.ignorouParte && <p className={s.nota}>{MENSAGEM_PARTE_IGNORADA}</p>}
              {fase.avisos.map((a) => (
                <p key={a} className={s.nota} role="status">
                  {a}
                </p>
              ))}
              <div className={s.acoes}>
                {e.acoes.map((a) => (
                  <CartaoAcao key={a.id} acao={a} ocupado={ocupado} aoAgir={agir} />
                ))}
              </div>
              {!e.acoes.length && e.falhas.length > 0 && (
                <ul className={s.falhas}>
                  {[...new Set(e.falhas)].map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              )}
              {e.tipo === "erro" && !e.acoes.length && (
                <p className={s.recusa}>Tente dizer de outro jeito, com o dia e o horário.</p>
              )}
            </>
          )}
          {aviso && (
            <p className={s.erro} role="alert">
              {aviso}
            </p>
          )}
        </main>
        <footer className={s.rodape}>
          <Link href="/agenda" className={s.botaoBranco}>
            Ver na agenda
          </Link>
          <button
            type="button"
            className={s.redondoGrande}
            aria-label="Falar de novo"
            onClick={() => {
              window.history.replaceState(null, "", "/voz");
              falar();
            }}
          >
            <IconeMicrofone tamanho={24} />
          </button>
        </footer>
      </div>
    );
  }

  // ---------------------------------------------------------------- Pronto, ouvindo, digitando, pensando

  const ouvindo = fase.nome === "ouvindo";
  return (
    <div className={s.tela}>
      <header className={s.topo}>
        {fechar}
        <Relogio fuso={fuso} />
        <span className={s.espaco} />
      </header>
      <main className={s.conteudo} data-centro>
        {fase.nome === "pronto" && (
          <>
            <h1 className={s.titulo}>O que você quer fazer?</h1>
            <p className={s.subtitulo}>
              Fale do seu jeito. Antes de você sair, eu mostro tudo o que mudei.
            </p>
            <Pentagono>
              <button
                type="button"
                className={s.microfone}
                onClick={falar}
                aria-label="Toque para falar"
              >
                <IconeMicrofone />
              </button>
            </Pentagono>
            <p className={s.legenda}>Toque para falar</p>
            <Sugestoes aoEscolher={enviar} />
            {aviso && <p className={s.nota}>{aviso}</p>}
          </>
        )}

        {ouvindo && (
          <>
            <p className={s.ouvindo} role="status">
              <span className={s.pontoLaranja} /> Ouvindo
            </p>
            <p className={s.transcricao} aria-live="polite">
              {escuta.final}
              <span className={s.provisorio}>{escuta.provisorio}</span>
              {!escuta.final && !escuta.provisorio && (
                <span className={s.provisorio}>Pode falar…</span>
              )}
            </p>
            <Onda />
            <button
              type="button"
              className={s.parar}
              onClick={escuta.parar}
              aria-label="Toque para terminar"
            >
              <span />
            </button>
            <p className={s.legenda}>Toque para terminar</p>
          </>
        )}

        {fase.nome === "digitando" && (
          <form
            className={s.formTexto}
            onSubmit={(ev) => {
              ev.preventDefault();
              void enviar(rascunho);
            }}
          >
            <h1 className={s.titulo}>O que você quer fazer?</h1>
            {aviso && <p className={s.nota}>{aviso}</p>}
            <label htmlFor="pedido" className={s.rotulo}>
              {comVoz ? "Digite o pedido" : "Toque no microfone do teclado para ditar, ou digite"}
            </label>
            <textarea
              id="pedido"
              ref={campo}
              className={s.campoTexto}
              rows={4}
              maxLength={LIMITE_TEXTO_PEDIDO}
              value={rascunho}
              onChange={(ev) => setRascunho(ev.target.value)}
              placeholder="Ex.: muda a academia de hoje para as duas da tarde"
              enterKeyHint="send"
              onKeyDown={(ev) => {
                if (ev.key === "Enter" && !ev.shiftKey) {
                  ev.preventDefault();
                  void enviar(rascunho);
                }
              }}
            />
            <button type="submit" className={s.botaoBranco} disabled={!rascunho.trim()}>
              Enviar
            </button>
            <Sugestoes aoEscolher={enviar} />
          </form>
        )}

        {fase.nome === "pensando" && (
          <>
            <p className={s.ouvindo} role="status">
              <span className={s.pontoLaranja} data-pulsa /> Organizando
            </p>
            <p className={s.transcricao}>{fase.texto}</p>
          </>
        )}

        {fase.nome === "erro" && (
          <>
            <h1 className={s.titulo}>Não deu certo.</h1>
            <VocePediu texto={fase.texto} />
            <p className={s.erro} role="alert">
              {fase.mensagem}
            </p>
            <div className={s.linhaBotoes}>
              <button type="button" className={s.botaoBranco} onClick={() => enviar(fase.texto)}>
                Tentar de novo
              </button>
            </div>
          </>
        )}
      </main>
      {(fase.nome === "pronto" || fase.nome === "erro") && (
        <footer className={s.rodapeSimples}>
          <button
            type="button"
            className={s.link}
            onClick={() => {
              escuta.cancelar();
              setFase({ nome: "digitando" });
            }}
          >
            Digitar em vez de falar
          </button>
        </footer>
      )}
    </div>
  );
}
