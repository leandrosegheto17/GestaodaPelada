import type { FormEvent, ReactNode } from 'react';
import estilos from './Pagina.module.css';

interface Props {
  aoEnviar: () => void;
  enviando?: boolean;
  children: ReactNode;
}

/** `<form>` sem validação do navegador (as mensagens são nossas) e com `aria-busy` ao enviar. */
export function Formulario({ aoEnviar, enviando = false, children }: Props) {
  const aoSubmeter = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    aoEnviar();
  };
  return (
    <form className={estilos.formulario} noValidate onSubmit={aoSubmeter} aria-busy={enviando || undefined}>
      {children}
    </form>
  );
}

/** Texto de ajuda solto entre campos (fora da moldura de um campo). */
export function AjudaDoFormulario({ children }: { children: ReactNode }) {
  return <p className={estilos.ajuda}>{children}</p>;
}
