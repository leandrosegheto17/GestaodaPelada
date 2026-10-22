import type { PeriodoPreviaResposta } from '@pelada/contrato';
import { useParams } from 'react-router';
import { Botao } from '../../componentes/basicos/Botao';
import { BotaoLink } from '../../componentes/basicos/BotaoLink';
import { Faixa } from '../../componentes/basicos/Faixa';
import { fraseDasRodadasQueEntram } from '../../componentes/previa-periodos';
import { dataCompleta } from '../../formatacao';
import estilos from './jogador.module.css';

/** Resultado de "Corrigir datas" ou de "Reativar" que a ficha mostra sob o título. */
export type FaixaDeDatas =
  | { tipo: 'corrigidas'; previa: PeriodoPreviaResposta }
  | { tipo: 'reativado'; apelido: string; dataRetorno: string; previa: PeriodoPreviaResposta | null }
  | { tipo: 'naoEncontrado' };

/** Rodadas que passaram a constar e o aviso da API; `null` quando não há o que avisar. */
function textoDeAtencao({ rodadasQuePassamAConstar, aviso }: PeriodoPreviaResposta): string | null {
  const texto = [fraseDasRodadasQueEntram(rodadasQuePassamAConstar, 'passado'), aviso].filter(Boolean).join(' ');
  return texto || null;
}

interface Props {
  /** Correção de datas ou reativação feita, ou recusada por jogador inexistente. */
  datas: FaixaDeDatas | null;
  salvo: boolean;
  inicioAlterado: boolean;
  /** Mensagem da recusa de exclusão por histórico; `null` quando não houve. */
  recusadaPorHistorico: string | null;
  falhaNaSituacao: boolean;
  aoInativarEmVezDeExcluir: () => void;
}

/** Faixas de aviso do cadastro/ficha do jogador, na ordem em que aparecem sob o título. */
export function FaixasDaFicha({
  datas,
  salvo,
  inicioAlterado,
  recusadaPorHistorico,
  falhaNaSituacao,
  aoInativarEmVezDeExcluir,
}: Props) {
  const { grupoId = '' } = useParams();
  const previa = datas && datas.tipo !== 'naoEncontrado' ? datas.previa : null;
  const atencao = previa ? textoDeAtencao(previa) : null;
  return (
    <>
      {datas?.tipo === 'corrigidas' ? (
        <div className={estilos.faixaSalvo}>
          <Faixa tipo="sucesso">Datas corrigidas.</Faixa>
        </div>
      ) : null}
      {datas?.tipo === 'reativado' ? (
        <div className={estilos.faixaSalvo}>
          <Faixa tipo="sucesso">
            {datas.apelido} reativado desde {dataCompleta(datas.dataRetorno)}.
          </Faixa>
        </div>
      ) : null}
      {atencao ? (
        <div className={estilos.faixaSalvo}>
          <Faixa
            tipo="atencao"
            acao={
              <BotaoLink variante="texto" to={`/admin/${encodeURIComponent(grupoId)}/partidas`}>
                Abrir partidas
              </BotaoLink>
            }
          >
            {atencao}
          </Faixa>
        </div>
      ) : null}
      {datas?.tipo === 'naoEncontrado' ? <Faixa tipo="erro">Jogador não encontrado.</Faixa> : null}
      {salvo ? (
        <div className={estilos.faixaSalvo}>
          <Faixa tipo="sucesso">Jogador salvo</Faixa>
        </div>
      ) : null}
      {inicioAlterado ? (
        <div className={estilos.faixaSalvo}>
          <Faixa tipo="sucesso">Data de início alterada</Faixa>
        </div>
      ) : null}
      {recusadaPorHistorico ? (
        <Faixa
          tipo="erro"
          acao={
            <Botao variante="texto" onClick={aoInativarEmVezDeExcluir}>
              Inativar em vez disso
            </Botao>
          }
        >
          {recusadaPorHistorico}
        </Faixa>
      ) : null}
      {falhaNaSituacao ? (
        <Faixa tipo="erro">Não foi possível concluir. Verifique a conexão e tente de novo.</Faixa>
      ) : null}
    </>
  );
}
