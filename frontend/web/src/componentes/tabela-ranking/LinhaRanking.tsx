import type { LinhaRankingPublica } from '@pelada/contrato';
import { juntar } from '../basicos/juntar';
import { MarcaRodada } from './MarcaRodada';
import estilos from './Ranking.module.css';

interface Props {
  linha: LinhaRankingPublica;
  /** Quando o mês não tem partidas: célula única com o aviso, só na primeira linha (`rowspan`). */
  semPartidas?: { linhasTotal: number } | undefined;
}

export function LinhaRanking({ linha, semPartidas }: Props) {
  return (
    <tr>
      <td className={estilos.pos}>{linha.posicao}</td>
      <th scope="row" className={estilos.nome}>
        {linha.apelido}
      </th>
      <td className={juntar(estilos.pts, estilos.inicial)}>{linha.ptsInicial}</td>
      {semPartidas ? (
        <td className={estilos.semPartidas} rowSpan={semPartidas.linhasTotal}>
          Nenhuma partida registrada neste mês
        </td>
      ) : null}
      {linha.rodadas.map((r, i) => (
        <td key={i} className={estilos.partida}>
          <MarcaRodada situacao={r.situacao} pontos={r.pontos} />
        </td>
      ))}
      <td className={estilos.pts}>{linha.ptsFinal}</td>
    </tr>
  );
}
