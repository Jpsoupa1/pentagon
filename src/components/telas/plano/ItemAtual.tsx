import { Botao } from "@/components/ui/Botao";
import { textoHoras } from "@/lib/plano";
import { Checklist } from "./Checklist";
import { rotuloDe, type GrupoDeChecks, type ItemAtual as Item } from "./comum";
import s from "./Plano.module.css";

/** O item atual da trilha, completo (seção 7.2 da especificação). */
export function ItemAtual({
  item,
  fase,
  padraoDeEntrega,
  ocupado,
  aoMarcar,
  aoConcluir,
}: {
  item: Item;
  /** Só na Teoria: a fase do item e as horas que faltam nela. */
  fase: string | null;
  padraoDeEntrega: readonly string[];
  ocupado: boolean;
  aoMarcar: (grupo: GrupoDeChecks, codigo: string, indice: number, feito: boolean) => void;
  aoConcluir: () => void;
}) {
  // O que fazer só aparece depois de "Antes de começar" (por exemplo, o alarme de cobrança).
  const liberado = item.antesDeComecar.every((_, i) => item.checks.antes.includes(i));
  const marcar = (grupo: GrupoDeChecks) => (indice: number, feito: boolean) =>
    aoMarcar(grupo, item.codigo, indice, feito);
  return (
    <article className={s.atual} aria-label={`Item atual: ${rotuloDe(item)}`}>
      <header>
        <p className={`${s.codigo} mono`}>{item.codigo}</p>
        <h3 className={s.tituloItem}>{item.titulo}</h3>
        {fase && <p className={s.meta}>{fase}</p>}
        <p className={s.meta}>{textoHoras(item.horasGastas, item.horas)}</p>
      </header>

      {item.antesDeComecar.length > 0 && (
        <Checklist
          titulo="Antes de começar"
          itens={item.antesDeComecar}
          marcados={item.checks.antes}
          desabilitado={ocupado}
          aoAlternar={marcar("antes")}
        />
      )}

      {liberado ? (
        <>
          {item.estudar && <Bloco titulo="O que estudar">{item.estudar}</Bloco>}
          {item.recurso && <Bloco titulo="Recurso">{item.recurso}</Bloco>}
          {item.etapas.length > 0 && (
            <Checklist
              titulo="Etapas"
              itens={item.etapas}
              marcados={item.checks.etapas}
              desabilitado={ocupado}
              aoAlternar={marcar("etapas")}
            />
          )}
          {item.entrega && (
            <Checklist
              titulo="Padrão de entrega"
              itens={padraoDeEntrega}
              marcados={item.checks.entrega}
              desabilitado={ocupado}
              aoAlternar={marcar("entrega")}
            />
          )}
        </>
      ) : (
        <p className={s.meta}>Marque o que vem antes para ver o resto do conteúdo.</p>
      )}

      <Bloco titulo="Critério de conclusão">{item.criterio}</Bloco>

      {item.tentativas.length > 0 && (
        <div>
          <h4 className={s.rotuloBloco}>Tentativas</h4>
          <ul className={`${s.tentativas} mono`}>
            {item.tentativas.map((t, i) => (
              <li key={i} data-aprovada={t.aprovada}>
                {t.nota}%{t.aprovada ? " (aprovada)" : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Botao onClick={aoConcluir} disabled={ocupado} aria-label={`Concluir ${rotuloDe(item)}`}>
        Concluir
      </Botao>
    </article>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: string }) {
  return (
    <div>
      <h4 className={s.rotuloBloco}>{titulo}</h4>
      <p>{children}</p>
    </div>
  );
}
