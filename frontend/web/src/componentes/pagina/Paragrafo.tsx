import type { ReactNode } from 'react';
import estilos from './Pagina.module.css';

/** Parágrafo de texto corrido (`.paragrafo`). */
export function Paragrafo({ children }: { children: ReactNode }) {
  return <p className={estilos.paragrafo}>{children}</p>;
}
