import { useId } from 'react';
import { Botao } from '../../componentes/basicos/Botao';
import estilos from './partida.module.css';

interface Props {
  busca: string;
  aoBuscar: (texto: string) => void;
  aoMarcarTodos: () => void;
  aoLimpar: () => void;
}

/** Busca local e ações em massa (valem para a lista inteira). */
export function FerramentasLista({ busca, aoBuscar, aoMarcarTodos, aoLimpar }: Props) {
  const id = useId();
  return (
    <div className={estilos.ferramentas}>
      <div>
        <label className="sr" htmlFor={id}>
          Buscar jogador
        </label>
        <input
          id={id}
          className={estilos.busca}
          type="search"
          placeholder="Buscar jogador"
          value={busca}
          onChange={(e) => aoBuscar(e.target.value)}
        />
      </div>
      <Botao variante="secundario" onClick={aoMarcarTodos}>
        Marcar todos como presentes
      </Botao>
      <Botao variante="texto" onClick={aoLimpar}>
        Limpar marcações
      </Botao>
    </div>
  );
}
