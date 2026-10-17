import { Botao } from '../../componentes/basicos/Botao';
import { CampoBusca } from '../../componentes/campos/CampoBusca';
import { FerramentasLista as Contenedor } from '../../componentes/pagina/FerramentasLista';

interface Props {
  busca: string;
  aoBuscar: (texto: string) => void;
  aoMarcarTodos: () => void;
  aoLimpar: () => void;
}

/** Busca local e ações em massa (valem para a lista inteira). */
export function FerramentasLista({ busca, aoBuscar, aoMarcarTodos, aoLimpar }: Props) {
  return (
    <Contenedor>
      <CampoBusca rotulo="Buscar jogador" valor={busca} aoMudar={aoBuscar} />
      <Botao variante="secundario" onClick={aoMarcarTodos}>
        Marcar todos como presentes
      </Botao>
      <Botao variante="texto" onClick={aoLimpar}>
        Limpar marcações
      </Botao>
    </Contenedor>
  );
}
