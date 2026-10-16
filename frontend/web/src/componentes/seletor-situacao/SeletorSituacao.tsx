import type { SituacaoPresenca } from '@pelada/contrato';
import { useId } from 'react';
import { ORDEM_SITUACAO_PRESENCA, ROTULO_SITUACAO_PRESENCA } from '../../rotulos';
import estilos from './SeletorSituacao.module.css';

interface Props {
  apelido: string;
  valor: SituacaoPresenca;
  aoMudar: (valor: SituacaoPresenca) => void;
}

/** Grupo de rádios nativo: as setas, o Tab único e o `radiogroup` vêm do navegador. */
export function SeletorSituacao({ apelido, valor, aoMudar }: Props) {
  const nome = useId();
  const idLegenda = useId();
  return (
    <fieldset className={estilos.seletor} role="radiogroup" aria-labelledby={idLegenda}>
      <legend id={idLegenda} className="sr">
        Situação de {apelido}
      </legend>
      {ORDEM_SITUACAO_PRESENCA.map((situacao) => {
        const { letra, texto } = ROTULO_SITUACAO_PRESENCA[situacao];
        return (
          <label key={situacao} className={estilos[situacao]}>
            <input
              type="radio"
              name={nome}
              value={situacao}
              checked={valor === situacao}
              onChange={() => aoMudar(situacao)}
            />
            <span className={estilos.opcao}>
              <i aria-hidden="true">{letra}</i>
              <small>{texto}</small>
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
