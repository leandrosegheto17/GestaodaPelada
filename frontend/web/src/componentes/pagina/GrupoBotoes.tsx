import type { ReactNode } from 'react';
import estilos from './Pagina.module.css';

/** Fileira de botões (`.grupo-botoes`). */
export function GrupoBotoes({ children }: { children: ReactNode }) {
  return <div className={estilos.grupoBotoes}>{children}</div>;
}
