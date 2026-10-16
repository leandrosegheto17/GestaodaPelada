import type { PainelDono } from '@pelada/contrato';
import { useId } from 'react';
import { Botao } from '../../componentes/basicos/Botao';
import { EstadoVazio } from '../../componentes/basicos/EstadoVazio';
import { Item } from '../../componentes/listas/Item';
import { Lista } from '../../componentes/listas/Lista';
import { diaMesHora } from '../../formatacao';
import estilos from './dono.module.css';

type Pedido = PainelDono['pedidosReset'][number];

interface Props {
  pedidos: readonly Pedido[];
  aoRedefinir: (pedido: Pedido) => void;
  aoResolver: (pedido: Pedido) => void;
  /** Conta com a ação em andamento (o botão mostra "carregando"). */
  ocupada: string | null;
}

/** Pedidos de reset de senha pendentes. Sem pedidos, o título fica sem contador. */
export function PedidosSenha({ pedidos, aoRedefinir, aoResolver, ocupada }: Props) {
  const id = useId();
  return (
    <section className={estilos.primeira} aria-labelledby={id}>
      <h2 id={id} className={estilos.subtitulo}>
        Pedidos de senha{pedidos.length > 0 ? ` (${pedidos.length})` : ''}
      </h2>
      {pedidos.length === 0 ? (
        <EstadoVazio titulo="Nenhum pedido pendente." nivel={3} />
      ) : (
        <Lista>
          {pedidos.map((pedido) => (
            <Item
              key={pedido.contaId}
              quebra
              titulo={pedido.email}
              meta={`${pedido.grupos.join(', ')} · último pedido ${diaMesHora(pedido.ultimoPedidoEm)}`}
              acoes={
                <span className={estilos.grupoBotoes}>
                  <Botao variante="secundario" onClick={() => aoRedefinir(pedido)}>
                    Redefinir senha
                  </Botao>
                  <Botao variante="texto" carregando={ocupada === pedido.contaId} onClick={() => aoResolver(pedido)}>
                    Marcar como resolvido
                  </Botao>
                </span>
              }
            />
          ))}
        </Lista>
      )}
    </section>
  );
}
