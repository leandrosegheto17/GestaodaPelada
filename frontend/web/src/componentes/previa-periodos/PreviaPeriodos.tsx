import type { PeriodoPreviaResposta } from '@pelada/contrato';
import { formatarPontos, pontosEscritos } from '../../formatacao';
import { Botao } from '../basicos/Botao';
import { Faixa } from '../basicos/Faixa';
import { fraseDasRodadasQueEntram, fraseDasRodadasQueSaem } from './frasesDasRodadas';
import estilos from './PreviaPeriodos.module.css';

export type EstadoPrevia =
  | { estado: 'vazia'; texto?: string }
  | { estado: 'calculando' }
  | { estado: 'pronta'; previa: PeriodoPreviaResposta }
  | { estado: 'falhaRede'; aoTentar: () => void };

/** Só formata o que a API calculou: nenhum ponto nem posição é conta da tela. */
function fraseDoAcumulado({ acumuladoAntes: antes, acumuladoDepois: depois }: PeriodoPreviaResposta): string {
  return antes === depois
    ? `Acumulado de ${pontosEscritos(antes)} não muda.`
    : `Acumulado de ${pontosEscritos(antes)} passa a ${formatarPontos(depois)}.`;
}

function fraseDaPosicao({ posicaoAntes: antes, posicaoDepois: depois }: PeriodoPreviaResposta): string | null {
  if (antes === null && depois === null) return null;
  if (antes === null) return `Passa a aparecer no ranking, na posição ${depois}.`;
  if (depois === null) return `Sai do ranking (hoje está na posição ${antes}).`;
  return antes === depois ? `Posição ${antes}, não muda.` : `Posição de ${antes} para ${depois}.`;
}

function frasesDasRodadas(previa: PeriodoPreviaResposta): string[] {
  return [
    fraseDasRodadasQueEntram(previa.rodadasQuePassamAConstar),
    fraseDasRodadasQueSaem(previa.rodadasQueDeixamDeConstar),
  ].filter((frase) => frase !== null);
}

function Pronta({ previa }: { previa: PeriodoPreviaResposta }) {
  const posicao = fraseDaPosicao(previa);
  const linhas = [
    posicao ? `${fraseDoAcumulado(previa)} ${posicao}` : fraseDoAcumulado(previa),
    ...frasesDasRodadas(previa),
  ];
  return (
    <>
      {linhas.map((linha) => (
        <p key={linha} className={estilos.paragrafo}>
          {linha}
        </p>
      ))}
      {previa.aviso ? <Faixa tipo="atencao">{previa.aviso}</Faixa> : null}
    </>
  );
}

/**
 * Prévia de corrigir datas e de reativar com retorno retroativo. A região que o leitor de tela anuncia
 * fica sempre montada (vazia, ou com `texto`, quando não há prévia); a faixa de falha de rede vem fora dela.
 */
export function PreviaPeriodos(props: EstadoPrevia) {
  return (
    <>
      <div aria-live="polite">
        {props.estado === 'vazia' ? <p className={estilos.paragrafo}>{props.texto}</p> : null}
        {props.estado === 'calculando' ? <p className={estilos.paragrafo}>Calculando…</p> : null}
        {props.estado === 'pronta' ? <Pronta previa={props.previa} /> : null}
        {props.estado === 'falhaRede' ? <p className={estilos.paragrafo}></p> : null}
      </div>
      {props.estado === 'falhaRede' ? (
        <Faixa
          tipo="erro"
          acao={
            <Botao variante="texto" onClick={props.aoTentar}>
              Tentar de novo
            </Botao>
          }
        >
          Não foi possível calcular. Verifique a conexão.
        </Faixa>
      ) : null}
    </>
  );
}
