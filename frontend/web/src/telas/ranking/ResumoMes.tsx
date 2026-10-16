import estilos from './ranking.module.css';

interface Props {
  partidas: number;
  comChuva: number;
}

const FRASE_ORDEM = 'Ordem pelos pontos acumulados até hoje.';

/** Resumo do mês; os números vêm da API. Mês sem partidas mostra só a frase da ordem. */
export function ResumoMes({ partidas, comChuva }: Props) {
  if (partidas === 0) return <p className={estilos.resumo}>{FRASE_ORDEM}</p>;
  return (
    <p className={estilos.resumo}>
      <strong>{partidas === 1 ? '1 partida' : `${partidas} partidas`}</strong> no mês,{' '}
      {comChuva === 0 ? 'nenhuma' : comChuva} com chuva. {FRASE_ORDEM}
    </p>
  );
}
