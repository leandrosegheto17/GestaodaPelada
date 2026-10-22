import type { JogadorDetalhe } from '@pelada/contrato';
import { Botao } from '../../componentes/basicos/Botao';
import type { PeriodoDoJogador } from '../../dados/elenco';
import { dataCompleta } from '../../formatacao';
import { ListaPeriodos } from './ListaPeriodos';
import estilos from './jogador.module.css';

interface Props {
  grupoId: string;
  jogador: JogadorDetalhe;
  aoCorrigir: (periodo: PeriodoDoJogador) => void;
  aoInativar: () => void;
  aoReativar: () => void;
  aoExcluir: () => void;
  reativando: boolean;
}

/** Situação do jogador: ativo (Inativar, Excluir) ou inativo (Reativar). */
export function SecaoSituacao({ grupoId, jogador, aoCorrigir, aoInativar, aoReativar, aoExcluir, reativando }: Props) {
  const id = 's-sit';
  const { ativo, desde } = jogador.situacao;
  return (
    <section className={estilos.secao} aria-labelledby={id}>
      <h2 id={id} className={estilos.subtitulo}>
        Situação
      </h2>
      <div className={estilos.situacao}>
        <p className={estilos.paragrafo}>
          {ativo ? 'Ativo' : 'Inativo'} desde {dataCompleta(desde)}.
        </p>
        <ListaPeriodos grupoId={grupoId} jogadorId={jogador.id} aoCorrigir={aoCorrigir} />
        {ativo ? null : (
          <p className={estilos.paragrafo}>
            Volta a aparecer no ranking e nas partidas; a data de início e os pontos não mudam.
          </p>
        )}
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
      </div>
    </section>
  );
}
