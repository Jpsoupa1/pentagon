"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AreaId } from "@/lib/dominio";
import { AREAS } from "@/lib/areas";
import { duracaoTexto } from "@/lib/tempo";
import { Logo } from "../ui/Logo";
import { Icone } from "./icones";
import { ativo, MENU, SECUNDARIO, type Contadores } from "./navegacao";
import { useNovoItem } from "./NovoItemProvider";
import s from "./Shell.module.css";

type Props = {
  contadores: Contadores;
  minutosPorArea: Record<AreaId, number>;
  usuario: { nome: string; email: string; imagem: string | null };
};

/** Notebook: barra lateral de 220 px. */
export function BarraLateral({ contadores, minutosPorArea, usuario }: Props) {
  const pathname = usePathname();
  const { abrir } = useNovoItem();
  return (
    <nav className={s.lateral} aria-label="Principal">
      <Link href="/" className={s.lateralLogo} aria-label="Pentagon, ir para Hoje">
        <Logo comNome />
      </Link>
      <button type="button" className={s.lateralNovo} onClick={() => abrir()}>
        <Icone nome="mais" tamanho={18} /> Novo item
      </button>
      <ul className={s.lateralMenu}>
        {[...MENU, ...SECUNDARIO].map((item) => {
          const atual = ativo(pathname, item.href);
          const n = item.contador ? contadores[item.contador] : 0;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={s.lateralItem}
                aria-current={atual ? "page" : undefined}
              >
                <Icone nome={item.icone} tamanho={19} />
                <span>{item.rotulo}</span>
                {n > 0 && <span className={`${s.contador} mono`}>{n}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className={s.lateralHoras}>
        <span className={s.lateralRotulo}>Horas da semana</span>
        <ul>
          {AREAS.map((a) => (
            <li key={a.id} data-area={a.id}>
              <span className={s.pontoArea} aria-hidden />
              <span>{a.curto}</span>
              <span className="mono">{duracaoTexto(minutosPorArea[a.id])}</span>
            </li>
          ))}
        </ul>
      </div>
      <Link href="/ajustes" className={s.usuario}>
        {usuario.imagem ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={usuario.imagem} alt="" width={34} height={34} className={s.avatar} />
        ) : (
          <span className={s.avatar} aria-hidden>
            {usuario.nome.slice(0, 1)}
          </span>
        )}
        <span className={s.usuarioTexto}>
          <strong>{usuario.nome}</strong>
          <span>Estagiário na Codevasf</span>
        </span>
      </Link>
    </nav>
  );
}

/** iPad horizontal: trilho de ícones de 76 px com "Novo" no pé. */
export function Trilho({ contadores }: Pick<Props, "contadores">) {
  const pathname = usePathname();
  const { abrir } = useNovoItem();
  return (
    <nav className={s.trilho} aria-label="Principal">
      <Link href="/" className={s.trilhoLogo} aria-label="Pentagon, ir para Hoje">
        <Logo tamanho={30} />
      </Link>
      <ul>
        {[...MENU, ...SECUNDARIO].map((item) => {
          const n = item.contador ? contadores[item.contador] : 0;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={s.trilhoItem}
                aria-current={ativo(pathname, item.href) ? "page" : undefined}
              >
                <Icone nome={item.icone} />
                <span>{item.curto}</span>
                {n > 0 && <span className={`${s.trilhoContador} mono`}>{n}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
      <button type="button" className={s.trilhoNovo} onClick={() => abrir()}>
        <Icone nome="mais" />
        <span>Novo</span>
      </button>
    </nav>
  );
}

const ABAS_IPAD = [MENU[0], MENU[1], MENU[2], MENU[3], MENU[4], MENU[6]];

/** iPad vertical: barra de abas flutuante centralizada. */
export function AbasFlutuantes() {
  const pathname = usePathname();
  const { abrir } = useNovoItem();
  return (
    <nav className={s.flutuante} aria-label="Principal">
      <ul>
        {ABAS_IPAD.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className={s.aba}
              aria-current={ativo(pathname, item.href) ? "page" : undefined}
            >
              <Icone nome={item.icone} />
              <span>{item.curto}</span>
            </Link>
          </li>
        ))}
        <li>
          <Link
            href="/areas"
            className={s.aba}
            aria-current={
              ativo(pathname, "/areas") ||
              ativo(pathname, "/estagio") ||
              ativo(pathname, "/ajustes")
                ? "page"
                : undefined
            }
          >
            <Icone nome="areas" />
            <span>Mais</span>
          </Link>
        </li>
        <li>
          <button
            type="button"
            className={s.abaNovo}
            onClick={() => abrir()}
            aria-label="Novo item"
          >
            <Icone nome="mais" />
          </button>
        </li>
      </ul>
    </nav>
  );
}

/** iPhone: abas fixas com o "+" no centro. */
export function AbasIphone() {
  const pathname = usePathname();
  const { abrir } = useNovoItem();
  const areasAtivo = ["/areas", "/aulas", "/provas", "/estudos", "/estagio", "/ajustes"].some((h) =>
    ativo(pathname, h),
  );
  const itens = [
    { href: "/", rotulo: "Hoje", icone: "hoje" as const, atual: ativo(pathname, "/") },
    {
      href: "/agenda",
      rotulo: "Agenda",
      icone: "agenda" as const,
      atual: ativo(pathname, "/agenda"),
    },
    null,
    { href: "/areas", rotulo: "Áreas", icone: "areas" as const, atual: areasAtivo },
    {
      href: "/lembretes",
      rotulo: "Lembretes",
      icone: "lembretes" as const,
      atual: ativo(pathname, "/lembretes"),
    },
  ];
  return (
    <nav className={s.abas} aria-label="Principal">
      <ul>
        {itens.map((item) =>
          item ? (
            <li key={item.href}>
              <Link
                href={item.href}
                className={s.aba}
                aria-current={item.atual ? "page" : undefined}
              >
                <Icone nome={item.icone} />
                <span>{item.rotulo}</span>
              </Link>
            </li>
          ) : (
            <li key="novo">
              <button
                type="button"
                className={s.abaNovo}
                onClick={() => abrir()}
                aria-label="Novo item"
              >
                <Icone nome="mais" />
              </button>
            </li>
          ),
        )}
      </ul>
    </nav>
  );
}
