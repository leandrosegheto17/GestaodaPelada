import type { ReactNode } from 'react';
import estilos from './Pagina.module.css';

/** Duas colunas em grade (`.duas-colunas`); a largura das colunas vem do contexto. */
export function DuasColunas({ children }: { children: ReactNode }) {
  return <div className={estilos.duasColunas}>{children}</div>;
}
