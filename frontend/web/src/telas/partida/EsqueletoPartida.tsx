import { FormaEsqueleto } from '../../componentes/basicos/Esqueleto';
import { usarAtraso } from '../../componentes/basicos/usarAtraso';
import { diaMes } from '../../formatacao';

interface Props {
  /** Data pedida (`AAAA-MM-DD`); sem ela, o texto fica sem data. */
  data: string | undefined;
}

/** Lista de jogadores a caminho: só aparece depois de 300 ms e anuncia o carregamento. */
export function EsqueletoPartida({ data }: Props) {
  const visivel = usarAtraso(300);
  if (!visivel) return null;
  return (
    <>
      <p className="sr" role="status">
        Carregando os jogadores ativos{data ? ` em ${diaMes(data)}` : ''}…
      </p>
      <FormaEsqueleto variante="bloco" quantidade={6} />
    </>
  );
}
