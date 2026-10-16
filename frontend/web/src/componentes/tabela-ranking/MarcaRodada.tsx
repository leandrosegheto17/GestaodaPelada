import { formatarPontos, pontosFalados } from '../../formatacao';
import { ROTULO_SITUACAO_RODADA, type SituacaoRodada } from '../../rotulos';
import { juntar } from '../basicos/juntar';
import estilos from './Marca.module.css';

const CLASSE: Record<SituacaoRodada, 'p' | 'l' | 'e' | 'f' | 'x'> = {
  presente: 'p',
  lesionado: 'l',
  expulso: 'e',
  falta: 'f',
  fora: 'x',
};

interface Props {
  situacao: SituacaoRodada;
  /** Nulo na rodada "–" (jogador fora do grupo na data). */
  pontos: number | null;
  /** Na legenda: só o desenho, sem o texto para leitor de tela e em tamanho menor. */
  decorativa?: boolean;
}

/** Pontos da rodada: cor + número (+ "L"/"E" no canto, falta tracejada). Só exibe o que recebe. */
export function MarcaRodada({ situacao, pontos, decorativa }: Props) {
  const visivel = pontos === null ? '–' : formatarPontos(pontos);
  const rotulo = ROTULO_SITUACAO_RODADA[situacao].texto;
  const lido = pontos === null ? rotulo : `${rotulo}, ${pontosFalados(pontos)}`;
  return (
    <>
      <span
        className={juntar(estilos.marca, estilos[CLASSE[situacao]], decorativa && estilos.legenda)}
        aria-hidden="true"
      >
        {visivel}
      </span>
      {decorativa ? null : <span className="sr">{lido}</span>}
    </>
  );
}
