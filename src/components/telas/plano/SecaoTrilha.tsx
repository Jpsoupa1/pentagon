import { BarraProgresso } from "@/components/ui/BarraProgresso";
import { Cartao, CartaoCabeca } from "@/components/ui/Cartao";
import { formatarHoras } from "@/lib/plano";
import { Concluidos } from "./Concluidos";
import { rotuloDe, type GrupoDeChecks, type PlanoIniciado, type TrilhaDoPlano } from "./comum";
import { ItemAtual } from "./ItemAtual";
import s from "./Plano.module.css";

const ROTULO_DO_BLOCO: Record<TrilhaDoPlano["bloco"], string> = {
  manha: "Bloco da manhã",
  teoria: "Bloco de teoria",
  projeto: "Bloco de projeto",
};

export type AcoesDaTrilha = {
  aoMarcar: (grupo: GrupoDeChecks, codigo: string, indice: number, feito: boolean) => void;
  aoConcluir: (codigo: string) => void;
  aoDesfazer: (codigo: string) => void;
};

/** Uma trilha: progresso, item atual (ou o que ele aguarda), próximos e concluídos. */
export function SecaoTrilha({
  trilha,
  plano,
  ocupado,
  acoes,
}: {
  trilha: TrilhaDoPlano;
  plano: PlanoIniciado;
  ocupado: boolean;
  acoes: AcoesDaTrilha;
}) {
  const { atual, progresso } = trilha;
  const fase =
    trilha.slug === "teoria" && atual?.fase != null
      ? plano.fases.find((f) => f.numero === atual.fase)
      : undefined;
  return (
    <Cartao aria-labelledby={`trilha-${trilha.slug}`}>
      <CartaoCabeca
        titulo={<span id={`trilha-${trilha.slug}`}>{trilha.nome}</span>}
        acao={<span className={s.meta}>{ROTULO_DO_BLOCO[trilha.bloco]}</span>}
      />
      <div className={s.progresso}>
        <BarraProgresso
          valor={progresso.total ? progresso.concluidos / progresso.total : 0}
          rotulo={`Progresso: ${trilha.nome}`}
        />
        <p className={s.meta}>
          {progresso.concluidos} de {progresso.total} concluídos. Faltam{" "}
          {formatarHoras(trilha.horasRestantes)}.
        </p>
      </div>

      {!atual && <p>Trilha concluída.</p>}
      {atual && trilha.estado === "aguardando" && (
        <div className={s.aguardando}>
          <p>Aguardando: {pendentesDe(trilha)}</p>
          <p className={s.meta}>Em seguida: {rotuloDe(atual)}</p>
        </div>
      )}
      {atual && trilha.estado === "disponivel" && (
        <ItemAtual
          item={atual}
          fase={
            fase
              ? `Fase ${fase.numero}: ${fase.nome}. Faltam ${formatarHoras(fase.horasRestantes)} na fase.`
              : null
          }
          padraoDeEntrega={plano.padraoDeEntrega}
          ocupado={ocupado}
          aoMarcar={acoes.aoMarcar}
          aoConcluir={() => acoes.aoConcluir(atual.codigo)}
        />
      )}

      {trilha.proximos.length > 0 && (
        <div>
          <h3 className={s.rotuloBloco}>Próximos</h3>
          <ol className={s.linhas}>
            {trilha.proximos.map((p) => (
              <li key={p.codigo}>{rotuloDe(p)}</li>
            ))}
          </ol>
        </div>
      )}

      <Concluidos
        concluidos={trilha.concluidos}
        fuso={plano.fuso}
        ocupado={ocupado}
        aoDesfazer={acoes.aoDesfazer}
      />
    </Cartao>
  );
}

/** "A3. Título, A4. Título": o que falta para o item atual ser liberado. */
function pendentesDe(trilha: TrilhaDoPlano) {
  return (trilha.atual?.pendentes ?? []).map(rotuloDe).join(", ");
}
