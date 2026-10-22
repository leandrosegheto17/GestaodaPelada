import { useId } from 'react';
import { Botao } from '../../componentes/basicos/Botao';
import { classesBotao } from '../../componentes/basicos/classesBotao';
import { ErroRede } from '../../componentes/basicos/ErroRede';
import { Esqueleto } from '../../componentes/basicos/Esqueleto';
import { Item } from '../../componentes/listas/Item';
import { Lista } from '../../componentes/listas/Lista';
import { usePeriodos, type PeriodoDoJogador } from '../../dados/elenco';
import { dataCompleta } from '../../formatacao';
import { rotuloTipoPeriodo } from '../../rotulos';
import estilos from './jogador.module.css';

interface Props {
  grupoId: string;
  jogadorId: string;
  aoCorrigir: (periodo: PeriodoDoJogador) => void;
}

const SEM_CORRECAO = 'Nada a corrigir: a data de entrada é a data de início da pontuação (use Alterar data de início).';

/** Períodos de atividade do jogador, com o atalho para corrigir as datas de cada um. */
export function ListaPeriodos({ grupoId, jogadorId, aoCorrigir }: Props) {
  const idRotulo = useId();
  const periodos = usePeriodos(grupoId, jogadorId);
  return (
    <div className={estilos.campoTexto}>
      <span className={estilos.rotulo} id={idRotulo}>
        Períodos de atividade
      </span>
      {periodos.isError ? (
        <ErroRede aoTentar={() => void periodos.refetch()} />
      ) : periodos.data ? (
        <Lista rotuladaPor={idRotulo}>
          {periodos.data.periodos.map((periodo) => (
            <LinhaPeriodo key={periodo.id} periodo={periodo} aoCorrigir={aoCorrigir} />
          ))}
        </Lista>
      ) : (
        <Esqueleto variante="linha" quantidade={2} />
      )}
    </div>
  );
}

function LinhaPeriodo({ periodo, aoCorrigir }: { periodo: PeriodoDoJogador; aoCorrigir: Props['aoCorrigir'] }) {
  const id = useId();
  const idExplicacao = `${id}-nada`;
  const corrigivel = periodo.corrigivel.saida || periodo.corrigivel.retorno;
  const intervalo = (
    <span id={id}>
      {dataCompleta(periodo.inicio)} <span aria-hidden="true">→</span>
      <span className="sr">até</span> {periodo.fim ? dataCompleta(periodo.fim) : 'atual'}
    </span>
  );
  const descricao = corrigivel ? id : `${id} ${idExplicacao}`;
  return (
    <Item
      quebra
      titulo={intervalo}
      meta={
        <>
          <span className={estilos.blocoMeta}>{rotuloTipoPeriodo(periodo.tipo)}</span>
          {corrigivel ? null : (
            <span className={estilos.blocoMeta} id={idExplicacao}>
              {SEM_CORRECAO}
            </span>
          )}
        </>
      }
      acoes={
        corrigivel ? (
          <Botao variante="secundario" aria-describedby={descricao} onClick={() => aoCorrigir(periodo)}>
            Corrigir datas
          </Botao>
        ) : (
          <button
            type="button"
            className={classesBotao({ variante: 'secundario' })}
            aria-disabled="true"
            aria-describedby={descricao}
          >
            Corrigir datas
          </button>
        )
      }
    />
  );
}
