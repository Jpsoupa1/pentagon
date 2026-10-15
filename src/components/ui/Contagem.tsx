import { contagemRegressiva } from "@/lib/contagem";
import s from "./ui.module.css";

export function Contagem({ alvo, agora, fuso }: { alvo: Date; agora?: Date; fuso?: string }) {
  const c = contagemRegressiva(alvo, agora, fuso);
  return <span className={`${s.contagem} ${s[c.tom]}`}>{c.texto}</span>;
}
