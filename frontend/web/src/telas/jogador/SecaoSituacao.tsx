import type { JogadorDetalhe } from '@pelada/contrato';
import { useState } from 'react';
import { Botao } from '../../componentes/basicos/Botao';
import type { PeriodoDoJogador } from '../../dados/elenco';
import { useGrupo } from '../../dados/grupo';
import { dataCompleta } from '../../formatacao';
import { DialogoCorrigirDatas } from './DialogoCorrigirDatas';
import { DialogoReativar } from './DialogoReativar';
import type { FaixaDeDatas } from './FaixasDaFicha';
import { ListaPeriodos } from './ListaPeriodos';
import estilos from './jogador.module.css';

interface Props {
  grupoId: string;
  jogador: JogadorDetalhe;
  /** Resultado de "Corrigir datas" ou de "Reativar" (ou `null` ao abrir de novo) para a ficha mostrar sob o título. */
  aoDatas: (resultado: FaixaDeDatas | null) => void;
  aoInativar: () => void;
  aoExcluir: () => void;
}

/** Situação do jogador: ativo (Inativar, Excluir) ou inativo (Reativar). */
export function SecaoSituacao({ grupoId, jogador, aoDatas, aoInativar, aoExcluir }: Props) {
  const id = 's-sit';
  const [periodo, setPeriodo] = useState<PeriodoDoJogador | null>(null);
  const [reativando, setReativando] = useState(false);
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
            <Botao
              variante="secundario"
              onClick={() => {
                aoDatas(null);
                setReativando(true);
              }}
            >
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
      {reativando && hoje ? (
        <DialogoReativar
          grupoId={grupoId}
          jogadorId={jogador.id}
          apelido={jogador.apelido}
          hoje={hoje}
          aoCancelar={() => setReativando(false)}
          aoReativado={(dataRetorno, previa) => {
            setReativando(false);
            aoDatas({ tipo: 'reativado', apelido: jogador.apelido, dataRetorno, previa });
          }}
          aoNaoEncontrado={() => {
            setReativando(false);
            aoDatas({ tipo: 'naoEncontrado' });
          }}
        />
      ) : null}
    </section>
  );
}
