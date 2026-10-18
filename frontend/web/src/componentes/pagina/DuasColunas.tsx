import type { ReactNode } from 'react';
import estilos from './Pagina.module.css';

/** Um campo por linha no celular e dois lado a lado a partir de 600px. */
export function DuasColunas({ children }: { children: ReactNode }) {
  return <div className={estilos.duasColunas}>{children}</div>;
}
