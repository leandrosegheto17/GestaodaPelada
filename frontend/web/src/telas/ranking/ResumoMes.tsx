import { Icone } from '../../componentes/basicos/Icone';
import estilos from './ranking.module.css';

interface Props {
  partidas: number;
  comChuva: number;
  /** Mostrando o ranking guardado enquanto a rede responde. */
  atualizando?: boolean;
}

const FRASE_ORDEM = 'Ordem pelos pontos acumulados até hoje.';

/** Resumo do mês; os números vêm da API. Mês sem partidas mostra só a frase da ordem. */
export function ResumoMes({ partidas, comChuva, atualizando }: Props) {
  const aviso = atualizando ? (
    <span className={estilos.atualizando} role="status">
      <Icone nome="atualizar" tamanho={14} />
      atualizando…
    </span>
  ) : (
    FRASE_ORDEM
  );
  if (partidas === 0) return <p className={estilos.resumo}>{aviso}</p>;
  return (
    <p className={estilos.resumo}>
      <strong>{partidas === 1 ? '1 partida' : `${partidas} partidas`}</strong> no mês,{' '}
      {comChuva === 0 ? 'nenhuma' : comChuva} com chuva. {aviso}
    </p>
  );
}
