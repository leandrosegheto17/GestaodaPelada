import type { AvaliacaoSimulador } from '@pelada/contrato';
import type { GrupoParaTrocar } from '../../componentes/ajuste-simulador';

/** Os outros jogadores, agrupados pelo lugar em que estão agora ("Time A · Titulares", "Não entra"…). */
export function gruposParaTrocar(exibicao: AvaliacaoSimulador, idExcluido: string): GrupoParaTrocar[] {
  const sem = <T extends { id: string }>(lista: readonly T[]) => lista.filter((j) => j.id !== idExcluido);
  if (exibicao.formato === 'varios_times') {
    return exibicao.times.map((t) => ({ titulo: t.nome, jogadores: sem(t.jogadores) }));
  }
  return [
    ...exibicao.times.flatMap((t) => [
      { titulo: `${t.nome} · Titulares`, jogadores: sem(t.titulares) },
      { titulo: `${t.nome} · Entram no 2º tempo`, jogadores: sem(t.entramNo2oTempo) },
    ]),
    { titulo: 'Não entra', jogadores: sem(exibicao.naoEntra) },
  ];
}
