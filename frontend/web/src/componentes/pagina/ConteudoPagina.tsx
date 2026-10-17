import type { ReactNode } from 'react';
import { juntar } from '../basicos/juntar';
import estilos from './Pagina.module.css';

interface Props {
  /** Largura de formulário, para páginas fora do layout do admin. */
  estreito?: boolean;
  children: ReactNode;
}

/** Área de conteúdo de páginas que não passam pelo layout do admin (`.conteudo`/`.conteudo--estreito`). */
export function ConteudoPagina({ estreito = false, children }: Props) {
  return <div className={juntar(estilos.conteudo, estreito && estilos.conteudoEstreito)}>{children}</div>;
}
