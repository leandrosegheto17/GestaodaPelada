import type { PeriodoPreviaResposta } from '@pelada/contrato';
import { pontosEscritos } from '../../formatacao';
import { Botao } from '../basicos/Botao';
import { Faixa } from '../basicos/Faixa';
import { listaDeDatas } from './listaDeDatas';
import estilos from './PreviaPeriodos.module.css';

export type EstadoPrevia =
  | { estado: 'calculando' }
  | { estado: 'pronta'; previa: PeriodoPreviaResposta }
  | { estado: 'falhaRede'; aoTentar: () => void };

/** Só formata o que a API calculou: nenhum ponto nem posição é conta da tela. */
function fraseDoAcumulado({ acumuladoAntes: antes, acumuladoDepois: depois }: PeriodoPreviaResposta): string {
  return antes === depois
    ? `Acumulado de ${pontosEscritos(antes)} não muda.`
    : `Acumulado de ${pontosEscritos(antes)} passa a ${depois}.`;
}

function fraseDaPosicao({ posicaoAntes: antes, posicaoDepois: depois }: PeriodoPreviaResposta): string | null {
  if (antes === null && depois === null) return null;
  if (antes === null) return `Passa a aparecer no ranking, na posição ${depois}.`;
  if (depois === null) return `Sai do ranking (hoje está na posição ${antes}).`;
  return antes === depois ? `Posição ${antes}, não muda.` : `Posição de ${antes} para ${depois}.`;
}

function frasesDasRodadas({
  rodadasQuePassamAConstar: entram,
  rodadasQueDeixamDeConstar: saem,
}: PeriodoPreviaResposta): string[] {
  const frases: string[] = [];
  if (entram.length > 0) {
    const verbo = entram.length === 1 ? '1 rodada passa' : `${entram.length} rodadas passam`;
    frases.push(`${verbo} a constar: ${listaDeDatas(entram.map((r) => r.data))}.`);
  }
  if (saem.length > 0) {
    const verbo = saem.length === 1 ? '1 rodada deixa' : `${saem.length} rodadas deixam`;
    frases.push(`${verbo} de constar: ${listaDeDatas(saem.map((r) => r.data))}.`);
  }
  return frases;
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

/** Prévia de corrigir datas e de reativar com retorno retroativo, numa região que o leitor de tela anuncia. */
export function PreviaPeriodos(props: EstadoPrevia) {
  return (
    <div aria-live="polite">
      {props.estado === 'calculando' ? <p className={estilos.paragrafo}>Calculando…</p> : null}
      {props.estado === 'pronta' ? <Pronta previa={props.previa} /> : null}
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
    </div>
  );
}
