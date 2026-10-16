import type { PartidaNova, SituacaoPresenca } from '@pelada/contrato';
import type { ReactNode } from 'react';
import { juntar } from '../basicos/juntar';
import { SeletorSituacao } from './SeletorSituacao';
import estilos from './LinhaJogador.module.css';

type JogadorDaPartida = PartidaNova['jogadores'][number];

interface PropsLinha {
  jogador: Pick<JogadorDaPartida, 'apelido'>;
  valor: SituacaoPresenca;
  aoMudar: (valor: SituacaoPresenca) => void;
}

/** O nome falado vem da legenda do seletor; o apelido visível é decorativo (como no mockup). */
export function LinhaJogador({ jogador, valor, aoMudar }: PropsLinha) {
  return (
    <li className={estilos.linha}>
      <span className={estilos.nome} aria-hidden="true">
        {jogador.apelido}
      </span>
      <SeletorSituacao apelido={jogador.apelido} valor={valor} aoMudar={aoMudar} />
    </li>
  );
}

export function ListaSituacao({ duasColunas, children }: { duasColunas?: boolean; children: ReactNode }) {
  return <ul className={juntar(estilos.lista, duasColunas && estilos.duas)}>{children}</ul>;
}
