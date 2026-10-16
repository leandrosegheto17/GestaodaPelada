import type { ReactNode } from 'react';
import { BarraTitulo } from '../barras/BarraTitulo';
import { PularConteudo } from '../barras/PularConteudo';
import { Voltar } from '../basicos/Voltar';
import estilos from './Pagina.module.css';

interface Props {
  /** `<title>` e `h1` da página. */
  titulo: string;
  voltarPara?: string;
  voltarRotulo?: string;
  /** Barra no lugar da barra com o nome do app (ex.: barra do admin com o nome do grupo). */
  barra?: ReactNode;
  children: ReactNode;
}

/** Página estreita de formulário fora do admin (entrar, esqueci a senha, nova senha). */
export function PaginaFormulario({ titulo, voltarPara, voltarRotulo, barra, children }: Props) {
  return (
    <>
      <title>{titulo}</title>
      <PularConteudo />
      {barra ?? <BarraTitulo titulo="Gestão da Pelada" />}
      <main id="conteudo" tabIndex={-1} className={estilos.conteudo}>
        {voltarPara && voltarRotulo ? <Voltar para={voltarPara} rotulo={voltarRotulo} /> : null}
        <h1 className={estilos.titulo}>{titulo}</h1>
        {children}
      </main>
    </>
  );
}
