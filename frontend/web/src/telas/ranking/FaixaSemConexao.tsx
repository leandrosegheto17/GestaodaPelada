import { Faixa } from '../../componentes/basicos/Faixa';
import { diaMesHora } from '../../formatacao';

interface Props {
  /** `geradoEm` do ranking que está na tela. */
  geradoEm: string;
}

export function FaixaSemConexao({ geradoEm }: Props) {
  return (
    <Faixa tipo="atencao" topo>
      Sem conexão, atualizado em {diaMesHora(geradoEm)}
    </Faixa>
  );
}
