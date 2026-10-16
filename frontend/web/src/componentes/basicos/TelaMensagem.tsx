import type { ReactNode } from 'react';
import { Icone, type NomeIcone } from './Icone';
import estilos from './EstadoVazio.module.css';

interface Props {
  icone?: NomeIcone;
  titulo: string;
  texto?: ReactNode;
  acao?: ReactNode;
}

/** Tela inteira com uma única mensagem (indisponível, sem permissão, não encontrado). */
export function TelaMensagem({ icone = 'info', titulo, texto, acao }: Props) {
  return (
    <main className={estilos.mensagem}>
      <div className={estilos.icone}>
        <Icone nome={icone} tamanho={56} />
      </div>
      <h1 className={estilos.titulo}>{titulo}</h1>
      {texto ? <p className={estilos.texto}>{texto}</p> : null}
      {acao}
    </main>
  );
}
