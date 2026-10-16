import { useId, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { usarFocoModal } from './usarFocoModal';
import estilos from './Dialogo.module.css';

interface Props {
  titulo: string;
  descricao?: string;
  /** Ação destrutiva: vira `alertdialog` e Esc não fecha. O véu nunca fecha. */
  destrutivo?: boolean;
  refFocoInicial?: RefObject<HTMLElement | null>;
  aoFechar: () => void;
  children?: ReactNode;
  /** Botões, na ordem de leitura (no celular aparecem empilhados com o primeiro embaixo). */
  acoes?: ReactNode;
}

/** Montado = aberto. Quem usa renderiza condicionalmente. */
export function Dialogo({ titulo, descricao, destrutivo, refFocoInicial, aoFechar, children, acoes }: Props) {
  const idTitulo = useId();
  const idDescricao = useId();
  const refConteudo = useRef<HTMLElement>(null);
  usarFocoModal({ refConteudo, refFocoInicial, aoFechar, fecharComEsc: !destrutivo });
  return createPortal(
    <div className={estilos.veu}>
      <section
        ref={refConteudo}
        className={estilos.dialogo}
        role={destrutivo ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby={idTitulo}
        aria-describedby={descricao ? idDescricao : undefined}
        tabIndex={-1}
      >
        <h2 id={idTitulo} className={estilos.titulo}>
          {titulo}
        </h2>
        {descricao ? (
          <p id={idDescricao} className={estilos.texto}>
            {descricao}
          </p>
        ) : null}
        {children}
        {acoes ? <div className={estilos.acoes}>{acoes}</div> : null}
      </section>
    </div>,
    document.body,
  );
}
