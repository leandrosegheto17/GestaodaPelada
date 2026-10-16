import { useId, useState } from 'react';
import { LIMITES } from '@pelada/contrato';
import { Botao } from '../basicos/Botao';
import { Campo, type PropsCampo } from './Campo';

interface Props extends Omit<PropsCampo, 'children' | 'lado' | 'classeEntrada' | 'id'> {
  valor: string;
  aoMudar: (valor: string) => void;
  /** Obrigatório: `current-password` ou `new-password`. */
  autoComplete: 'current-password' | 'new-password';
  id?: string;
}

export function CampoSenha({ valor, aoMudar, autoComplete, id, ...moldura }: Props) {
  const gerado = useId();
  const idEntrada = id ?? gerado;
  const [visivel, setVisivel] = useState(false);
  return (
    <Campo
      {...moldura}
      id={idEntrada}
      lado={
        <Botao
          variante="secundario"
          aria-pressed={visivel}
          aria-controls={idEntrada}
          onClick={() => setVisivel(!visivel)}
        >
          Mostrar
        </Botao>
      }
    >
      {(entrada) => (
        <input
          {...entrada}
          type={visivel ? 'text' : 'password'}
          autoComplete={autoComplete}
          maxLength={LIMITES.senha.max}
          value={valor}
          onChange={(e) => aoMudar(e.target.value)}
        />
      )}
    </Campo>
  );
}
