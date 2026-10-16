import type { ReactNode } from 'react';
import estilos from './Lista.module.css';

interface Props {
  /** Nome acessível da lista (opcional). */
  rotulo?: string;
  children: ReactNode;
}

export function Lista({ rotulo, children }: Props) {
  return (
    <ul className={estilos.lista} aria-label={rotulo}>
      {children}
    </ul>
  );
}
