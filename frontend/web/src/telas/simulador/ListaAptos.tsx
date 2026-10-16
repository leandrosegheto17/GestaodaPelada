import type { ContextoSimulador } from '@pelada/contrato';
import { Botao } from '../../componentes/basicos/Botao';
import { Selo } from '../../componentes/basicos/Selo';
import { CaixaSelecao, Interruptor } from '../../componentes/escolhas';
import { Item } from '../../componentes/listas/Item';
import { Lista } from '../../componentes/listas/Lista';
import { formatarNivel } from '../../formatacao';
import type { Acao, EstadoEntradas } from './estadoEntradas';
import estilos from './simulador.module.css';

interface Props {
  jogadores: ContextoSimulador['jogadores'];
  estado: EstadoEntradas;
  /** Ids marcados (já limitados à lista atual). */
  marcados: ReadonlySet<string>;
  despachar: (acao: Acao) => void;
}

/** Aptos da data: marcar quem joga e, em 2 times, quem só joga o 1º tempo. O nível vem da API. */
export function ListaAptos({ jogadores, estado, marcados, despachar }: Props) {
  const todos = jogadores.map((j) => j.id);
  const dois = estado.formato === 'dois_times';
  return (
    <div>
      <h2 className={estilos.subtitulo}>Aptos ({marcados.size})</h2>
      <div className={estilos.grupoBotoes}>
        <Botao variante="texto" onClick={() => despachar({ tipo: 'marcarTodos', todos })}>
          Marcar todos
        </Botao>
        <Botao variante="texto" onClick={() => despachar({ tipo: 'desmarcarTodos' })}>
          Desmarcar todos
        </Botao>
      </div>
      <div className={estilos.aptos}>
        <Lista>
          {jogadores.map((j) => {
            const marcado = marcados.has(j.id);
            return (
              <Item
                key={j.id}
                titulo={
                  <CaixaSelecao
                    rotulo={j.apelido}
                    marcada={marcado}
                    aoMudar={(m) => despachar({ tipo: 'marcar', id: j.id, marcado: m, todos })}
                  />
                }
                lado={
                  <>
                    {j.semNota ? (
                      <Selo tom="atencao">sem nota</Selo>
                    ) : (
                      <span className={estilos.nivel}>nível {formatarNivel(j.nivel)}</span>
                    )}
                    {dois ? (
                      <Interruptor
                        rotuloAcessivel={`Só 1º tempo: ${j.apelido}`}
                        marcado={marcado && estado.so1oTempo.has(j.id)}
                        aoMudar={(valor) => despachar({ tipo: 'so1oTempo', id: j.id, valor })}
                        textoLigado="Só 1º"
                        textoDesligado="Só 1º"
                        desabilitado={!marcado}
                      />
                    ) : null}
                  </>
                }
              />
            );
          })}
        </Lista>
      </div>
    </div>
  );
}
