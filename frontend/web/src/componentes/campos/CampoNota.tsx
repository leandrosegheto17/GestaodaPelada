import { LIMITES } from '@pelada/contrato';
import { Campo, type PropsCampo } from './Campo';

interface Props extends Omit<PropsCampo, 'children' | 'lado' | 'classeEntrada'> {
  /** Nota de 1 a 10, ou `null` quando vazia ("–"). */
  nota: number | null;
  aoMudar: (nota: number | null) => void;
}

const NOTAS = Array.from({ length: LIMITES.nota.max - LIMITES.nota.min + 1 }, (_, i) => LIMITES.nota.min + i);

export function CampoNota({ nota, aoMudar, ...moldura }: Props) {
  return (
    <Campo {...moldura} classeEntrada="nota">
      {(entrada) => (
        <select
          {...entrada}
          value={nota === null ? '' : String(nota)}
          onChange={(e) => aoMudar(e.target.value === '' ? null : Number(e.target.value))}
        >
          <option value="">{'–'}</option>
          {NOTAS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      )}
    </Campo>
  );
}
