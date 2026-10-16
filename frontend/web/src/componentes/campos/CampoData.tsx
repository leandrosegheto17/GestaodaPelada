import { Campo, type PropsCampo } from './Campo';

interface Props extends Omit<PropsCampo, 'children' | 'lado' | 'classeEntrada'> {
  /** `AAAA-MM-DD`, sem conversão de fuso. */
  valor: string;
  aoMudar: (valor: string) => void;
  min?: string;
  max?: string;
}

export function CampoData({ valor, aoMudar, min, max, ...moldura }: Props) {
  return (
    <Campo {...moldura}>
      {(entrada) => (
        <input {...entrada} type="date" min={min} max={max} value={valor} onChange={(e) => aoMudar(e.target.value)} />
      )}
    </Campo>
  );
}
