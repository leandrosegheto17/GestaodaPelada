import type { MesFinanceiro } from '@pelada/contrato';
import { useId } from 'react';
import { Interruptor } from '../../componentes/escolhas/Interruptor';
import { formatarMoeda } from '../../formatacao';
import estilos from './financeiro.module.css';

type Pagamento = MesFinanceiro['pagamentos'][number];

interface Props {
  pagamentos: readonly Pagamento[];
  mensalidadeCentavos: number | null;
  /** Marcar ou desmarcar o pagamento (a ação e a confirmação são da tela). */
  aoMudar?: (pagamento: Pagamento, pagou: boolean) => void;
  /** Jogadores com pedido em andamento: só o interruptor deles fica desligado. */
  ocupados?: ReadonlySet<string>;
}

/** Quem pagou no mês: um interruptor por jogador ativo, na ordem recebida. */
export function SecaoPagamentos({ pagamentos, mensalidadeCentavos, aoMudar, ocupados }: Props) {
  const id = useId();
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className={estilos.subtitulo}>
        Pagamentos do mês{mensalidadeCentavos === null ? '' : ` · ${formatarMoeda(mensalidadeCentavos)}`}
      </h2>
      {pagamentos.length === 0 ? (
        <p className={estilos.ajuda}>Nenhum jogador ativo neste mês.</p>
      ) : (
        <ul className={estilos.lista}>
          {pagamentos.map((p) => (
            <li key={p.jogadorId} className={estilos.linhaPagamento}>
              <span className={estilos.nome}>{p.apelido}</span>
              <Interruptor
                rotuloAcessivel={`Pagou: ${p.apelido}`}
                marcado={p.pagou}
                aoMudar={(pagou) => aoMudar?.(p, pagou)}
                textoLigado="Pagou"
                textoDesligado="Não pagou"
                desabilitado={ocupados?.has(p.jogadorId) ?? false}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
