import type { JogadorDetalhe } from '@pelada/contrato';
import { useId } from 'react';
import { Botao } from '../../componentes/basicos/Botao';
import { dataCompleta } from '../../formatacao';
import estilos from './jogador.module.css';

interface Props {
  jogador: JogadorDetalhe;
  aoInativar: () => void;
  aoReativar: () => void;
  aoExcluir: () => void;
  reativando: boolean;
}

/** Situação do jogador: ativo (Inativar, Excluir) ou inativo (Reativar). */
export function SecaoSituacao({ jogador, aoInativar, aoReativar, aoExcluir, reativando }: Props) {
  const id = useId();
  const { ativo, desde } = jogador.situacao;
  return (
    <section className={estilos.secao} aria-labelledby={id}>
      <h2 id={id} className={estilos.subtitulo}>
        Situação
      </h2>
      <p className={estilos.paragrafo}>
        {ativo ? 'Ativo' : 'Inativo'} desde {dataCompleta(desde)}.
      </p>
      <div className={estilos.grupoBotoes}>
        {ativo ? (
          <Botao variante="secundario" onClick={aoInativar}>
            Inativar
          </Botao>
        ) : (
          <Botao variante="secundario" carregando={reativando} onClick={aoReativar}>
            Reativar
          </Botao>
        )}
        <Botao variante="textoDestrutivo" onClick={aoExcluir}>
          Excluir jogador
        </Botao>
      </div>
    </section>
  );
}
