import type { ReactNode } from 'react';
import estilos from './Pagina.module.css';

/** Cartão com moldura (`.cartao`). */
export function Cartao({ children }: { children: ReactNode }) {
  return <div className={estilos.cartao}>{children}</div>;
}
