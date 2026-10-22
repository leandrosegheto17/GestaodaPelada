import type { JogadorDetalhe } from '@pelada/contrato';
import { useState } from 'react';
import { Botao } from '../../componentes/basicos/Botao';
import type { PeriodoDoJogador } from '../../dados/elenco';
import { useGrupo } from '../../dados/grupo';
import { dataCompleta } from '../../formatacao';
import { DialogoCorrigirDatas } from './DialogoCorrigirDatas';
import type { FaixaDeDatas } from './FaixasDaFicha';
import { ListaPeriodos } from './ListaPeriodos';
import estilos from './jogador.module.css';

interface Props {
  grupoId: string;
  jogador: JogadorDetalhe;
  /** Resultado de "Corrigir datas" (ou `null` ao abrir de novo) para a ficha mostrar sob o título. */
  aoDatas: (resultado: FaixaDeDatas | null) => void;
  aoInativar: () => void;
  aoReativar: () => void;
  aoExcluir: () => void;
  reativando: boolean;
}

/** Situação do jogador: ativo (Inativar, Excluir) ou inativo (Reativar). */
export function SecaoSituacao({ grupoId, jogador, aoDatas, aoInativar, aoReativar, aoExcluir, reativando }: Props) {
  const id = 's-sit';
  const [periodo, setPeriodo] = useState<PeriodoDoJogador | null>(null);
  const hoje = useGrupo(grupoId).data?.hoje;
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
        <ListaPeriodos
          grupoId={grupoId}
          jogadorId={jogador.id}
          aoCorrigir={(p) => {
            aoDatas(null);
            setPeriodo(p);
          }}
        />
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
      {periodo && hoje ? (
        <DialogoCorrigirDatas
          grupoId={grupoId}
          jogadorId={jogador.id}
          apelido={jogador.apelido}
          hoje={hoje}
          periodo={periodo}
          aoCancelar={() => setPeriodo(null)}
          aoCorrigido={(previa) => {
            setPeriodo(null);
            aoDatas({ tipo: 'corrigidas', previa });
          }}
          aoNaoEncontrado={() => {
            setPeriodo(null);
            aoDatas({ tipo: 'naoEncontrado' });
          }}
        />
      ) : null}
    </section>
  );
}
