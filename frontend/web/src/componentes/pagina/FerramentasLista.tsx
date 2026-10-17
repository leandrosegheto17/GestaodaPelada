import type { ReactNode } from 'react';
import estilos from './Pagina.module.css';

/** Barra de busca/filtros acima de uma lista (`.ferramentas-lista`). */
export function FerramentasLista({ children }: { children: ReactNode }) {
  return <div className={estilos.ferramentasLista}>{children}</div>;
}
