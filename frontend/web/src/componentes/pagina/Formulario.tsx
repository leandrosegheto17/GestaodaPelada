import type { FormEvent, ReactNode } from 'react';
import estilos from './Pagina.module.css';

interface Props {
  aoEnviar: () => void;
  enviando?: boolean;
  /** Troca a classe padrão (grade de campos) quando a tela precisa de outro leiaute. */
  className?: string;
  children: ReactNode;
}

/** `<form>` sem validação do navegador (as mensagens são nossas) e com `aria-busy` ao enviar. */
export function Formulario({ aoEnviar, enviando = false, className, children }: Props) {
  const aoSubmeter = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    aoEnviar();
  };
  return (
    <form
      className={className ?? estilos.formulario}
      noValidate
      onSubmit={aoSubmeter}
      aria-busy={enviando || undefined}
    >
      {children}
    </form>
  );
}

/** Pilha de campos com o mesmo espaçamento do formulário, para quando o `<form>` é de outro leiaute. */
export function CamposEmGrade({ children }: { children: ReactNode }) {
  return <div className={estilos.formulario}>{children}</div>;
}

/** Texto de ajuda solto entre campos (fora da moldura de um campo). */
export function AjudaDoFormulario({ children }: { children: ReactNode }) {
  return <p className={estilos.ajuda}>{children}</p>;
}
