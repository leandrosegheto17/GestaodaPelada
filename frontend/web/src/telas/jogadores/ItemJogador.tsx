import type { ListaJogadores } from '@pelada/contrato';
import { Selo } from '../../componentes/basicos/Selo';
import { Item } from '../../componentes/listas/Item';
import { dataCompleta } from '../../formatacao';
import { formatarNivel } from '../../formatacao/numeros';
import { rotuloPosicao } from '../../rotulos';

type Jogador = ListaJogadores['ativos'][number] & { inativoDesde?: string };

interface Props {
  grupoId: string;
  jogador: Jogador;
}

/** Linha de jogador: posição e nível (ou "sem nota"); inativo mostra desde quando. */
export function ItemJogador({ grupoId, jogador }: Props) {
  const meta = jogador.semNota
    ? rotuloPosicao(jogador.posicao)
    : `${rotuloPosicao(jogador.posicao)} · nível ${formatarNivel(jogador.nivel)}`;
  return (
    <Item
      titulo={jogador.apelido}
      meta={meta}
      lado={
        jogador.inativoDesde ? (
          <Selo>inativo desde {dataCompleta(jogador.inativoDesde)}</Selo>
        ) : jogador.semNota ? (
          <Selo tom="atencao">sem nota</Selo>
        ) : undefined
      }
      para={`/admin/${encodeURIComponent(grupoId)}/jogadores/${encodeURIComponent(jogador.id)}`}
    />
  );
}
