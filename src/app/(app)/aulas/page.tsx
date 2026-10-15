import type { Metadata } from "next";
import Link from "next/link";
import { BotaoApagar, NovaDisciplina, RegistrarFalta } from "@/components/telas/Acoes";
import { Cartao, CartaoCabeca } from "@/components/ui/Cartao";
import { Contagem } from "@/components/ui/Contagem";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { LinhaAgenda } from "@/components/ui/LinhaAgenda";
import { CabecalhoPagina, layout } from "@/components/ui/Pagina";
import { TIPO_AVALIACAO_NOME } from "@/lib/dominio";
import { dataCurta, DIAS, DIAS_CURTOS, horaLocal, partesLocais } from "@/lib/tempo";
import { alvoDeEdicao } from "@/lib/alvo";
import { idSchema } from "@/server/api";
import { exigirUsuario } from "@/server/sessao";
import { obterAjustes } from "@/server/servicos/ajustes";
import { gradeDasDisciplinas, proximasAulas, type HorarioAula } from "@/server/servicos/aulas";
import { detalheDisciplina, listarDisciplinas } from "@/server/servicos/disciplinas";

export const metadata: Metadata = { title: "Aulas" };

function horarioCurto(h: HorarioAula[]) {
  return h.map((x) => `${DIAS_CURTOS[x.diaSemana]} ${x.inicio}`).join(" · ");
}

export default async function Aulas({ searchParams }: PageProps<"/aulas">) {
  const usuario = await exigirUsuario();
  const { fuso } = await obterAjustes(usuario.id);
  const [disciplinas, grade] = await Promise.all([
    listarDisciplinas(usuario.id),
    gradeDasDisciplinas(usuario.id),
  ]);
  const { d } = await searchParams;
  const selecionada = idSchema.safeParse(d).success
    ? disciplinas.find((x) => x.id === d)
    : disciplinas[0];

  return (
    <>
      <CabecalhoPagina
        titulo="Aulas"
        sobre={`${disciplinas.length} disciplinas`}
        acoes={<NovaDisciplina />}
      />
      {!disciplinas.length ? (
        <Cartao>
          <EstadoVazio centro>Nenhuma aula cadastrada. Adicione a primeira.</EstadoVazio>
        </Cartao>
      ) : (
        <div className={layout.listaDetalhe}>
          <Cartao aria-label="Disciplinas">
            <ul className={layout.lista}>
              {disciplinas.map((x) => (
                <li key={x.id}>
                  <Link
                    href={`/aulas?d=${x.id}`}
                    className={layout.itemLink}
                    aria-current={x.id === selecionada?.id ? "page" : undefined}
                    data-area="aulas"
                  >
                    <span className={layout.iniciais}>{x.sigla.slice(0, 4)}</span>
                    <span className={layout.itemTexto}>
                      <span className={layout.itemTitulo}>{x.nome}</span>
                      <span className={`${layout.meta} mono`}>
                        {horarioCurto(grade.filter((g) => g.subjectId === x.id)) || "Sem horário"}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Cartao>
          {selecionada && (
            <Detalhe userId={usuario.id} id={selecionada.id} fuso={fuso} grade={grade} />
          )}
        </div>
      )}
    </>
  );
}

async function Detalhe({
  userId,
  id,
  fuso,
  grade,
}: {
  userId: string;
  id: string;
  fuso: string;
  grade: HorarioAula[];
}) {
  const [det, proximas] = await Promise.all([
    detalheDisciplina(userId, id),
    proximasAulas(userId, id, fuso),
  ]);
  const agora = new Date();
  const proximaAvaliacao = det.avaliacoes.find((a) => !a.concluidaEm && a.entregaEm >= agora);
  const daDisciplina = grade.filter((g) => g.subjectId === id);
  const { disciplina } = det;

  return (
    <div className={layout.pilha}>
      <Cartao>
        <CartaoCabeca
          titulo={disciplina.nome}
          acao={
            <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <RegistrarFalta disciplinaId={disciplina.id} />
              <NovaDisciplina editar={disciplina} />
            </span>
          }
        />
        <p className={layout.meta}>
          {disciplina.professor || "Professor não informado"} ·{" "}
          {disciplina.sala || "Sala não informada"}
        </p>
        <div className={layout.numeros} style={{ marginTop: 14 }}>
          <div className={layout.numero}>
            <span className={layout.meta}>Faltas</span>
            <strong>
              {det.faltasUsadas}/{disciplina.limiteFaltas || "—"}
            </strong>
          </div>
          <div className={layout.numero}>
            <span className={layout.meta}>Média parcial</span>
            <strong>{det.media === null ? "—" : det.media.toFixed(1).replace(".", ",")}</strong>
          </div>
          <div className={layout.numero}>
            <span className={layout.meta}>Próxima avaliação</span>
            <strong style={{ fontSize: 15 }}>
              {proximaAvaliacao ? <Contagem alvo={proximaAvaliacao.entregaEm} fuso={fuso} /> : "—"}
            </strong>
          </div>
        </div>
      </Cartao>
      {det.faltas.length > 0 && (
        <Cartao>
          <CartaoCabeca titulo="Faltas registradas" nivel={3} />
          <ul className={layout.lista}>
            {det.faltas.map((x) => (
              <li key={x.id} className={layout.itemLink}>
                <span className={layout.itemTexto}>
                  <span className={`${layout.itemTitulo} mono`}>{dataCurta(x.data)}</span>
                  <span className={layout.meta}>
                    {x.quantidade} {x.quantidade === 1 ? "aula" : "aulas"}
                  </span>
                </span>
                <BotaoApagar
                  url={`/api/faltas/${x.id}`}
                  rotulo={`Apagar falta de ${dataCurta(x.data)}`}
                />
              </li>
            ))}
          </ul>
        </Cartao>
      )}
      <div className={layout.duas}>
        <Cartao>
          <CartaoCabeca titulo="Próximas aulas" nivel={3} />
          {proximas.length ? (
            <ul className={layout.lista}>
              {proximas.map((o) => (
                <LinhaAgenda
                  key={o.chave}
                  hora={dataCurta(partesLocais(o.inicio, fuso).data)}
                  area="aulas"
                  titulo={`${DIAS[partesLocais(o.inicio, fuso).diaSemana]}, ${horaLocal(o.inicio, fuso)}`}
                  meta={o.local ?? undefined}
                  editar={alvoDeEdicao(o)}
                />
              ))}
            </ul>
          ) : (
            <EstadoVazio>Nenhuma aula marcada nas próximas semanas.</EstadoVazio>
          )}
        </Cartao>
        <Cartao>
          <CartaoCabeca titulo="Grade da semana" nivel={3} />
          {daDisciplina.length ? (
            <ul className={layout.lista}>
              {daDisciplina.map((g, i) => (
                <LinhaAgenda
                  key={i}
                  hora={DIAS_CURTOS[g.diaSemana]}
                  area="aulas"
                  titulo={`${g.inicio} – ${g.fim}`}
                  meta={g.local ?? undefined}
                />
              ))}
            </ul>
          ) : (
            <EstadoVazio>
              Sem horário. Crie um compromisso de Aulas ligado a esta disciplina.
            </EstadoVazio>
          )}
        </Cartao>
      </div>
      <Cartao>
        <CartaoCabeca titulo="Avaliações" nivel={3} />
        {det.avaliacoes.length ? (
          <ul className={layout.lista}>
            {det.avaliacoes.map((a) => (
              <li key={a.id}>
                <Link href={`/provas?item=${a.id}`} className={layout.itemLink}>
                  <span className={layout.itemTexto}>
                    <span className={layout.itemTitulo}>{a.titulo}</span>
                    <span className={layout.meta}>
                      {TIPO_AVALIACAO_NOME[a.tipo]} · peso {a.peso ?? "—"} · nota {a.nota ?? "—"}
                    </span>
                  </span>
                  <Contagem alvo={a.entregaEm} fuso={fuso} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EstadoVazio>Nenhuma avaliação desta disciplina.</EstadoVazio>
        )}
      </Cartao>
    </div>
  );
}
