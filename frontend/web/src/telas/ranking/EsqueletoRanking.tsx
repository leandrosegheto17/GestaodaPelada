import { BarraCarregando } from '../../componentes/barras/BarraCarregando';
import { FormaEsqueleto } from '../../componentes/basicos/Esqueleto';
import { usarAtraso } from '../../componentes/basicos/usarAtraso';
import estilos from './ranking.module.css';

/** Primeira visita sem cache: nada nos primeiros 300 ms (evita piscar), depois o esqueleto. */
export function EsqueletoRanking() {
  const visivel = usarAtraso(300);
  if (!visivel) return null;
  return (
    <>
      <BarraCarregando />
      <main className={estilos.conteudo} aria-busy="true">
        <p className="sr" role="status">
          Carregando o ranking…
        </p>
        <FormaEsqueleto variante="mes" />
        <div className={estilos.tabelaEsqueleto} aria-hidden="true">
          <FormaEsqueleto variante="linhaTabela" quantidade={10} />
        </div>
      </main>
    </>
  );
}
