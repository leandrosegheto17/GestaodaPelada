import type { ReactNode } from 'react';
import estilos from './Pagina.module.css';

/** Seção separada por filete (`.secao`). */
export function Secao({ children }: { children: ReactNode }) {
  return <section className={estilos.secao}>{children}</section>;
}
