import Link from "next/link";
import type { TrilhaResumo } from "@/server/servicos/roadmap";
import type { Aba } from "./comum";
import s from "./Roadmap.module.css";

/** Seletor segmentado entre as trilhas. Trocar de trilha mantém a aba de recursos aberta. */
export function TrocarTrilha({
  trilhas,
  atual,
  aba,
}: {
  trilhas: TrilhaResumo[];
  atual: string;
  aba: Aba;
}) {
  return (
    <nav className={s.trocar} aria-label="Trocar de trilha">
      {trilhas.map((t) => (
        <Link
          key={t.slug}
          href={`/trilhas/${t.slug}/roadmap?aba=${aba}`}
          className={s.trocarItem}
          aria-current={t.slug === atual ? "page" : undefined}
          scroll={false}
        >
          {t.nome.replace(/^Trilha /, "")}
        </Link>
      ))}
    </nav>
  );
}
