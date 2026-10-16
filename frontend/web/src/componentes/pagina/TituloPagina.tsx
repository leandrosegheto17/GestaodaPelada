import type { ReactNode } from 'react';
import estilos from './Pagina.module.css';

/** `h1` das telas do admin (o mesmo estilo de "Entrar", "Partidas", "Jogadores"). */
export function TituloPagina({ children }: { children: ReactNode }) {
  return <h1 className={estilos.titulo}>{children}</h1>;
}
