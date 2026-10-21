import { useId } from 'react';
import { Botao } from '../../componentes/basicos/Botao';
import { dataCompleta } from '../../formatacao';
import estilos from './jogador.module.css';

interface Props {
  /** `AAAA-MM-DD`, vinda da API; a tela só formata. */
  inicio: string;
  aoAlterar: () => void;
}

/** Data de início da pontuação na edição: texto somente leitura e o botão que abre o diálogo de alteração. */
export function DataDeInicio({ inicio, aoAlterar }: Props) {
  const idValor = useId();
  return (
    <div className={estilos.campoTexto}>
      <span className={estilos.rotulo}>Data de início</span>
      <p className={estilos.paragrafo} id={idValor}>
        {dataCompleta(inicio)}
      </p>
      <div>
        <Botao variante="secundario" aria-describedby={idValor} onClick={aoAlterar}>
          Alterar data de início
        </Botao>
      </div>
    </div>
  );
}
