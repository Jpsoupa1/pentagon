import type { Metadata } from "next";
import Link from "next/link";
import { Icone } from "@/components/shell/icones";
import { Cartao } from "@/components/ui/Cartao";
import { CabecalhoPagina, layout } from "@/components/ui/Pagina";
import { AREAS } from "@/lib/areas";
import type { AreaId } from "@/lib/dominio";
import { duracaoTexto } from "@/lib/tempo";
import { exigirUsuario } from "@/server/sessao";
import { resumoNavegacao } from "@/server/servicos/navegacao";

export const metadata: Metadata = { title: "Áreas" };

const DESTINO: Record<AreaId, string> = {
  aulas: "/aulas",
  provas: "/provas",
  estudos: "/estudos",
  estagio: "/estagio",
  pessoal: "/agenda",
};

export default async function Areas() {
  const usuario = await exigirUsuario();
  const { minutosPorArea } = await resumoNavegacao(usuario.id);
  return (
    <>
      <CabecalhoPagina titulo="Áreas" sobre="Os cinco lados da semana" />
      <div className={layout.pilha}>
        <Cartao aria-label="Áreas">
          <ul className={layout.lista}>
            {AREAS.map((a) => (
              <li key={a.id}>
                <Link href={DESTINO[a.id]} className={layout.itemLink} data-area={a.id}>
                  <span className={layout.iniciais} aria-hidden>
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: "var(--area)",
                      }}
                    />
                  </span>
                  <span className={layout.itemTexto}>
                    <span className={layout.itemTitulo}>{a.nome}</span>
                    <span className={`${layout.meta} mono`}>
                      {duracaoTexto(minutosPorArea[a.id])} nesta semana
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Cartao>
        <Cartao aria-label="Mais">
          <ul className={layout.lista}>
            <li>
              <Link href="/voz" className={layout.itemLink}>
                <Icone nome="microfone" />
                <span className={layout.itemTitulo}>Assistente</span>
              </Link>
            </li>
            <li>
              <Link href="/lembretes" className={layout.itemLink}>
                <Icone nome="lembretes" />
                <span className={layout.itemTitulo}>Lembretes</span>
              </Link>
            </li>
            <li>
              <Link href="/ajustes" className={layout.itemLink}>
                <Icone nome="ajustes" />
                <span className={layout.itemTitulo}>Ajustes</span>
              </Link>
            </li>
          </ul>
        </Cartao>
      </div>
    </>
  );
}
