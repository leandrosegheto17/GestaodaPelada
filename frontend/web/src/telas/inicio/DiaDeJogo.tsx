import type { GrupoDetalhe } from '@pelada/contrato';
import { useId } from 'react';
import { BotaoLink } from '../../componentes/basicos/BotaoLink';
import { Icone } from '../../componentes/basicos/Icone';
import { recursos } from '../../config/recursos';
import { diaMes, diaSemanaCurto } from '../../formatacao';
import estilos from './inicio.module.css';

interface Props {
  /** Id do grupo na rota (`/admin/<id>`). */
  grupoId: string;
  inicio: GrupoDetalhe['inicio'];
}

/** Bloco "Dia de jogo": só exibe o que `inicio` traz (data sugerida, se a partida existe, escalação). */
export function DiaDeJogo({ grupoId, inicio }: Props) {
  const idTitulo = useId();
  const base = `/admin/${encodeURIComponent(grupoId)}`;
  const semJogadores = inicio.jogadoresAtivos === 0;
  const simulador = recursos.ligado('simulador');
  const confirmada = inicio.escalacaoConfirmadaPara;
  return (
    <section className={estilos.diaDeJogo} aria-labelledby={idTitulo}>
      <h2 id={idTitulo} className={estilos.titulo}>
        Dia de jogo
      </h2>
      {semJogadores ? (
        <>
          <p>Cadastre os jogadores para lançar partidas.</p>
          <BotaoLink to={`${base}/jogadores/novo`} bloco>
            Cadastrar jogadores
          </BotaoLink>
        </>
      ) : (
        <>
          <BotaoLink
            to={
              inicio.partidaNaDataSugerida
                ? `${base}/partidas/${inicio.dataSugeridaPartida}`
                : `${base}/partidas/nova?data=${inicio.dataSugeridaPartida}`
            }
            bloco
          >
            {inicio.partidaNaDataSugerida ? 'Editar' : 'Lançar'} partida de {diaSemanaCurto(inicio.dataSugeridaPartida)}
          </BotaoLink>
          {simulador ? (
            <>
              <BotaoLink to={`${base}/simulador`} variante="secundario" bloco>
                Simulador: {diaSemanaCurto(inicio.proximoDiaDeJogo)}
              </BotaoLink>
              <p className={estilos.status}>
                {confirmada ? (
                  <>
                    <Icone nome="sucesso" />
                    Escalação de {diaMes(confirmada)} confirmada
                  </>
                ) : (
                  <>Nenhuma escalação confirmada para {diaMes(inicio.proximoDiaDeJogo)}</>
                )}
              </p>
            </>
          ) : null}
        </>
      )}
    </section>
  );
}
