import type { AvaliacaoSimulador } from '@pelada/contrato';
import { TrocarCom } from '../../componentes/ajuste-simulador';
import { gruposParaTrocar } from './gruposParaTrocar';

export interface AlvoDoAjuste {
  id: string;
  modo: 'mover' | 'trocar';
}

interface Props {
  alvo: AlvoDoAjuste | null;
  jogador: { apelido: string } | undefined;
  exibicao: AvaliacaoSimulador;
  ajuste: { trocar: (alvoId: string, outroId: string) => void };
  definirAlvo: (alvo: AlvoDoAjuste | null) => void;
}

/** "Trocar com…" do jogador tocado; só aparece quando o alvo está no modo de troca. */
export function TrocarJogador({ alvo, jogador, exibicao, ajuste, definirAlvo }: Props) {
  if (!alvo || alvo.modo !== 'trocar' || !jogador) return null;
  return (
    <TrocarCom
      apelido={jogador.apelido}
      grupos={gruposParaTrocar(exibicao, alvo.id)}
      aoEscolher={(outro) => ajuste.trocar(alvo.id, outro)}
      aoVoltar={() => definirAlvo({ id: alvo.id, modo: 'mover' })}
      aoFechar={() => definirAlvo(null)}
    />
  );
}
