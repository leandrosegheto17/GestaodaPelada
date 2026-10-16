import type { RankingPublico } from '@pelada/contrato';
import { mesPorExtenso } from '../../formatacao';
import { juntar } from '../basicos/juntar';
import { CabecalhoPartida } from './CabecalhoPartida';
import { LinhaRanking } from './LinhaRanking';
import estilos from './Ranking.module.css';

interface Props {
  ranking: RankingPublico;
}

const nomeDoMes = (mes: string) => mesPorExtenso(mes).replace(/ de \d+$/, '');

/** Mostra exatamente o que a API devolveu: posição, ordem e pontos finais não são recalculados. */
export function TabelaRanking({ ranking }: Props) {
  const semPartidas = ranking.partidas.length === 0;
  const mesCorrente = ranking.mes === ranking.hoje.slice(0, 7);
  const textoInicial = mesCorrente ? 'antes das partidas do mês' : `início de ${nomeDoMes(ranking.mes)}`;
  const textoFinal = mesCorrente ? 'acumulado até hoje' : `fim de ${nomeDoMes(ranking.mes)}`;
  return (
    <div
      className={estilos.rolagem}
      role="region"
      aria-label="Tabela do ranking (role para o lado para ver as partidas)"
      tabIndex={0}
    >
      <table className={estilos.ranking}>
        <caption className="sr">
          {semPartidas
            ? `Ranking geral da ${ranking.grupo.nome}; ${mesPorExtenso(ranking.mes)} não tem partidas`
            : `Ranking geral da ${ranking.grupo.nome}, com os pontos de cada partida de ${mesPorExtenso(ranking.mes)}`}
        </caption>
        <thead>
          <tr>
            <th scope="col" className={estilos.pos}>
              <abbr title="Posição">#</abbr>
            </th>
            <th scope="col" className={estilos.nome}>
              Jogador
            </th>
            <th scope="col" className={estilos.pts}>
              Pts inicial<span className="sr"> ({textoInicial})</span>
            </th>
            {semPartidas ? (
              <th scope="col">Partidas do mês</th>
            ) : (
              ranking.partidas.map((p) => <CabecalhoPartida key={p.data} data={p.data} choveu={p.choveu} />)
            )}
            <th scope="col" className={juntar(estilos.pts)}>
              Pts final<span className="sr"> ({textoFinal})</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {ranking.linhas.map((linha, i) => (
            <LinhaRanking
              key={`${linha.posicao}-${linha.apelido}`}
              linha={linha}
              semPartidas={semPartidas && i === 0 ? { linhasTotal: ranking.linhas.length } : undefined}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
