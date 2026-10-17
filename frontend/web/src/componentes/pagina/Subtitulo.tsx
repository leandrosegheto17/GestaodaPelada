import type { ReactNode } from 'react';
import estilos from './Pagina.module.css';

/** Subtítulo de seção (`.subtitulo` do mockup). */
export function Subtitulo({ children }: { children: ReactNode }) {
  return <h2 className={estilos.subtitulo}>{children}</h2>;
}
