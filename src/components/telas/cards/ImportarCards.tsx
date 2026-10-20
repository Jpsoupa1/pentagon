"use client";

import { useState } from "react";
import { validarImportacao, type ErroImportacao, type Importacao } from "@/lib/cards";
import { enviar } from "@/lib/cliente/api";
import { useAcervo } from "@/lib/cliente/cards";
import { Botao, BotaoLink } from "../../ui/Botao";
import { Cartao, CartaoCabeca } from "../../ui/Cartao";
import { layout } from "../../ui/Pagina";
import f from "../../shell/Form.module.css";
import s from "./Cards.module.css";

type Resultado = { importados: number; repetidos: string[]; erros: ErroImportacao[] };

const EXEMPLO = `{
  "cards": [
    {
      "id": "cka-arq-001",
      "trilha": "CKA",
      "tema": "Arquitetura do cluster",
      "frente": "Qual é o único componente que lê e grava no etcd?",
      "verso": "O kube-apiserver.",
      "codigo": "kubectl get pods -n kube-system",
      "origem": "aula",
      "criado_em": "2026-10-20"
    }
  ]
}`;

/** Tela /cards/importar: cola o JSON, confere antes (quantos entram, repetidos, erros) e importa. */
export function ImportarCards() {
  const { dados, recarregar } = useAcervo();
  const [texto, setTexto] = useState("");
  const [previa, setPrevia] = useState<Importacao | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  function conferir(conteudo = texto) {
    setResultado(null);
    setAviso(null);
    let json: unknown;
    try {
      json = JSON.parse(conteudo);
    } catch (e) {
      setPrevia({ ok: false, erro: `JSON inválido: ${(e as Error).message}` });
      return;
    }
    setPrevia(validarImportacao(json, dados?.cards.map((c) => c.chave) ?? []));
  }

  async function importar() {
    if (!previa?.ok || !previa.validos.length) return;
    setEnviando(true);
    // Só os válidos vão: o servidor confere de novo e ignora ids que já estão no acervo.
    const r = await enviar<Resultado>("POST", "/api/cards/importar", { cards: previa.validos });
    setEnviando(false);
    if (!r.ok) {
      setAviso(r.erro);
      return;
    }
    setPrevia(null);
    if (r.enfileirado) {
      setAviso("Sem conexão: a importação foi guardada e acontece quando a internet voltar.");
      return;
    }
    setResultado({
      ...r.dados,
      repetidos: [...(previa.repetidos ?? []), ...r.dados.repetidos],
      erros: previa.erros,
    });
    setTexto("");
    await recarregar();
  }

  return (
    <div className={layout.duas}>
      <Cartao>
        <CartaoCabeca titulo="Colar JSON" />
        <div className={f.form}>
          <label className={f.campo}>
            <span className={f.rotulo}>Cards</span>
            <textarea
              className={`${f.entrada} ${s.json}`}
              value={texto}
              onChange={(e) => {
                setTexto(e.target.value);
                setPrevia(null);
              }}
              placeholder={EXEMPLO}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
            />
          </label>
          <label className={`${f.campo} ${s.arquivo}`}>
            <span className={f.rotulo}>Ou escolha um arquivo .json</span>
            <input
              type="file"
              accept="application/json,.json"
              onChange={async (e) => {
                const arquivo = e.target.files?.[0];
                if (!arquivo) return;
                const conteudo = await arquivo.text();
                setTexto(conteudo);
                conferir(conteudo);
                e.target.value = "";
              }}
            />
          </label>
          <div>
            <Botao variante="secundario" disabled={!texto.trim()} onClick={() => conferir()}>
              Conferir
            </Botao>
          </div>
        </div>
      </Cartao>
      <Cartao aria-live="polite">
        <CartaoCabeca titulo={resultado ? "Importação concluída" : "Prévia"} />
        {resultado ? (
          <div className={f.form}>
            <Resumo
              entram={resultado.importados}
              repetidos={resultado.repetidos.length}
              erros={resultado.erros.length}
              verbo="entraram"
            />
            <ListaErros erros={resultado.erros} />
            <div className={s.acoesFolha}>
              <BotaoLink href="/cards" variante="primario">
                Ir para Cards
              </BotaoLink>
              <BotaoLink href="/cards/acervo">Ver acervo</BotaoLink>
            </div>
          </div>
        ) : previa ? (
          previa.ok ? (
            <div className={f.form}>
              <Resumo
                entram={previa.validos.length}
                repetidos={previa.repetidos.length}
                erros={previa.erros.length}
                verbo="entram"
              />
              {previa.repetidos.length > 0 && (
                <p className={layout.meta}>
                  Ignorados (id repetido):{" "}
                  <span className="mono">{previa.repetidos.join(", ")}</span>
                </p>
              )}
              <ListaErros erros={previa.erros} />
              {aviso && <p className={f.erroGeral}>{aviso}</p>}
              <div>
                <Botao disabled={!previa.validos.length || enviando} onClick={importar}>
                  {enviando
                    ? "Importando..."
                    : `Importar ${previa.validos.length} ${previa.validos.length === 1 ? "card" : "cards"}`}
                </Botao>
              </div>
            </div>
          ) : (
            <p className={f.erroGeral} role="alert">
              {previa.erro}
            </p>
          )
        ) : (
          <p className={layout.meta}>
            {aviso ??
              'Cole o JSON no formato { "cards": [...] } e toque em Conferir. Ids que já estão no acervo são ignorados; cards com erro aparecem aqui sem impedir os outros.'}
          </p>
        )}
      </Cartao>
    </div>
  );
}

function Resumo({
  entram,
  repetidos,
  erros,
  verbo,
}: {
  entram: number;
  repetidos: number;
  erros: number;
  verbo: string;
}) {
  return (
    <p className={s.resumo}>
      <span>
        <strong>{entram}</strong> {verbo}
      </span>
      <span>
        <strong>{repetidos}</strong> {repetidos === 1 ? "repetido" : "repetidos"}
      </span>
      <span>
        <strong>{erros}</strong> com erro
      </span>
    </p>
  );
}

function ListaErros({ erros }: { erros: ErroImportacao[] }) {
  if (!erros.length) return null;
  return (
    <ol className={s.errosImportacao}>
      {erros.map((e) => (
        <li key={e.indice}>
          <strong>
            #{e.indice + 1}
            {e.id ? ` ${e.id}` : ""}
          </strong>{" "}
          {e.mensagens.join("; ")}
        </li>
      ))}
    </ol>
  );
}
