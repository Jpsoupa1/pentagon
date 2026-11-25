import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Icone } from "@/components/shell/icones";
import { Cartao } from "@/components/ui/Cartao";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { CabecalhoPagina, layout } from "@/components/ui/Pagina";
import { recebeConteudoPessoal } from "@/server/permissao";
import { exigirUsuario } from "@/server/sessao";
import { listarRoadmaps } from "@/server/servicos/roadmap";

export const metadata: Metadata = { title: "Trilhas" };

export default async function Trilhas() {
  const usuario = await exigirUsuario();
  if (recebeConteudoPessoal(usuario.email)) redirect("/plano");
  const trilhas = await listarRoadmaps();
  return (
    <>
      <CabecalhoPagina titulo="Trilhas" sobre="Fases, portões e o que falta para cada um" />
      <Cartao aria-label="Trilhas">
        {trilhas.length ? (
          <ul className={layout.lista}>
            {trilhas.map((t) => (
              <li key={t.slug}>
                <Link href={`/trilhas/${t.slug}/roadmap`} className={layout.itemLink}>
                  <Icone nome="trilhas" />
                  <span className={layout.itemTexto}>
                    <span className={layout.itemTitulo}>{t.nome}</span>
                    <span className={layout.meta}>Roadmap · {t.titulo}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EstadoVazio centro>Nenhuma trilha cadastrada. Rode npm run seed:roadmap.</EstadoVazio>
        )}
      </Cartao>
    </>
  );
}
