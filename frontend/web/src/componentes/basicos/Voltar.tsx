import { Link } from 'react-router';
import { Icone } from './Icone';
import estilos from './Voltar.module.css';

interface Props {
  para: string;
  /** Ex.: "Voltar ao ranking". */
  rotulo: string;
}

export function Voltar({ para, rotulo }: Props) {
  return (
    <Link className={estilos.voltar} to={para}>
      <Icone nome="anterior" />
      {rotulo}
    </Link>
  );
}
