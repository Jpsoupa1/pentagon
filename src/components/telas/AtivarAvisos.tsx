"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { enviar } from "@/lib/cliente/api";
import { Botao } from "../ui/Botao";
import s from "../ui/Pagina.module.css";

type Estado = "carregando" | "sem-suporte" | "instalar" | "negado" | "desligado" | "ligado";

function base64ParaBytes(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const bruto = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bruto, (c) => c.charCodeAt(0));
}

const ehIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const instalado = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

function nomeDoAparelho() {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua) || ehIOS()) return "iPad";
  if (/Android/.test(ua)) return "Android";
  if (/Mac/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows";
  return "Linux";
}

const nada = () => () => {};

/**
 * Ativa os avisos neste aparelho. O pedido de permissão só sai do toque no botão
 * (exigência do iOS). No iPhone só funciona com o app instalado na Tela de Início.
 */
export function AtivarAvisos({ chavePublica }: { chavePublica: string | null }) {
  const montado = useSyncExternalStore(
    nada,
    () => true,
    () => false,
  );
  const [estado, setEstado] = useState<Estado>("carregando");
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    let cancelado = false;
    const definir = (e: Estado) => !cancelado && setEstado(e);
    (async () => {
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        return definir(ehIOS() && !instalado() ? "instalar" : "sem-suporte");
      }
      if (Notification.permission === "denied") return definir("negado");
      const reg = await navigator.serviceWorker.ready;
      const atual = await reg.pushManager.getSubscription();
      definir(atual && Notification.permission === "granted" ? "ligado" : "desligado");
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  async function ativar() {
    if (!chavePublica) return setMensagem("Avisos ainda não configurados no servidor.");
    setOcupado(true);
    setMensagem(null);
    try {
      const permissao = await Notification.requestPermission();
      if (permissao !== "granted") {
        setEstado(permissao === "denied" ? "negado" : "desligado");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const inscricao =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64ParaBytes(chavePublica),
        }));
      const json = inscricao.toJSON();
      const r = await enviar("POST", "/api/push/inscricoes", {
        endpoint: json.endpoint,
        keys: json.keys,
        aparelho: nomeDoAparelho(),
      });
      if (!r.ok) throw new Error(r.erro);
      setEstado("ligado");
      setMensagem("Avisos ativados neste aparelho.");
    } catch (erro) {
      setMensagem(
        `Não foi possível ativar: ${erro instanceof Error ? erro.message : "erro desconhecido"}`,
      );
    } finally {
      setOcupado(false);
    }
  }

  async function desativar() {
    setOcupado(true);
    const reg = await navigator.serviceWorker.ready;
    const inscricao = await reg.pushManager.getSubscription();
    if (inscricao) {
      await enviar("DELETE", "/api/push/inscricoes", { endpoint: inscricao.endpoint });
      await inscricao.unsubscribe();
    }
    setOcupado(false);
    setEstado("desligado");
    setMensagem("Avisos desligados neste aparelho.");
  }

  async function testar() {
    setOcupado(true);
    const r = await enviar<{ entregues: number }>("POST", "/api/push/teste");
    setOcupado(false);
    setMensagem(
      r.ok && r.dados
        ? `Aviso de teste enviado para ${r.dados.entregues} aparelho(s).`
        : "Falhou o teste.",
    );
  }

  if (!montado || estado === "carregando")
    return <p className={s.meta}>Verificando este aparelho...</p>;

  return (
    <div className={s.pilha}>
      {estado === "instalar" && (
        <p className={s.meta}>
          No iPhone os avisos só funcionam com o app instalado: no Safari, toque em Compartilhar e
          depois em Adicionar à Tela de Início. Abra o Pentagon pelo ícone e volte aqui.
        </p>
      )}
      {estado === "sem-suporte" && <p className={s.meta}>Este navegador não recebe avisos.</p>}
      {estado === "negado" && (
        <p className={s.meta}>
          Os avisos estão bloqueados. Libere em Ajustes do aparelho → Notificações → Pentagon (ou
          nas permissões do navegador) e volte aqui.
        </p>
      )}
      {estado === "desligado" && (
        <div>
          <Botao onClick={ativar} disabled={ocupado}>
            Ativar avisos neste aparelho
          </Botao>
        </div>
      )}
      {estado === "ligado" && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Botao variante="secundario" onClick={testar} disabled={ocupado}>
            Enviar aviso de teste
          </Botao>
          <Botao variante="fantasma" onClick={desativar} disabled={ocupado}>
            Desligar neste aparelho
          </Botao>
        </div>
      )}
      {ehIOS() && estado !== "instalar" && (
        <p className={s.meta}>
          No iPhone, os avisos chegam só com o app aberto pela Tela de Início (iOS 16.4 ou mais
          recente).
        </p>
      )}
      {mensagem && (
        <p role="status" className={s.meta}>
          {mensagem}
        </p>
      )}
    </div>
  );
}
