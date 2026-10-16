import { diaMes } from '../../formatacao';
import { IconeTempo } from './IconeTempo';
import estilos from './Ranking.module.css';

interface Props {
  data: string;
  choveu: boolean;
}

export function CabecalhoPartida({ data, choveu }: Props) {
  return (
    <th scope="col" className={estilos.partida}>
      {diaMes(data)}
      <IconeTempo choveu={choveu} />
      <span className="sr">{choveu ? ', com chuva' : ', sem chuva'}</span>
    </th>
  );
}
