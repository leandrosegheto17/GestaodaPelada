import { juntar } from './juntar';
import { usarAtraso } from './usarAtraso';
import estilos from './Esqueleto.module.css';

export type VarianteEsqueleto = 'linha' | 'titulo' | 'bloco' | 'botao' | 'naBarra' | 'mes' | 'linhaTabela';

interface Props {
  variante?: VarianteEsqueleto;
  /** Repete o esqueleto (ex.: linhas de uma lista). */
  quantidade?: number;
}

/** Só aparece depois de 300 ms; decorativo para leitores de tela. */
export function Esqueleto({ variante = 'bloco', quantidade = 1 }: Props) {
  const visivel = usarAtraso(300);
  if (!visivel) return null;
  return (
    <div aria-hidden="true">
      {Array.from({ length: quantidade }, (_, i) => (
        <span key={i} className={juntar(estilos.esqueleto, estilos[variante])} />
      ))}
    </div>
  );
}
