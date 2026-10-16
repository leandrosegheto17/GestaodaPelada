import type { AvisoSim } from '@pelada/dominio';

/** "A", "A e B", "A, B e C". */
export function listar(itens: readonly string[]): string {
  if (itens.length <= 1) return itens.join('');
  return `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`;
}

export interface ContextoTextos {
  apelidoDe: (id: string) => string;
  /** Nome do time de índice `i` ("Time A", "Time 3"). */
  nomeDoTime: (i: number) => string;
}

/** Texto de cada aviso, como a tela o mostra (o domínio só entrega ids e contagens). */
export function textoDoAviso(aviso: AvisoSim, ctx: ContextoTextos): string {
  switch (aviso.tipo) {
    case 'sem_nota': {
      const nomes = listar(aviso.ids.map(ctx.apelidoDe));
      return `${nomes} ${aviso.ids.length === 1 ? 'não tem nota' : 'não têm nota'}: usamos nível 5,5.`;
    }
    case 'so_1o_tempo_sem_reserva': {
      const quem = aviso.faltam === 1 ? 'jogador que só joga' : 'jogadores que só jogam';
      return `${ctx.nomeDoTime(aviso.time)}: ${aviso.faltam} ${quem} o 1º tempo sem reserva para entrar; o time terá menos gente no 2º tempo.`;
    }
    case 'composicao_diferente':
      return `A composição difere da prevista: confira ${listar(aviso.times.map(ctx.nomeDoTime))}.`;
    case 'incompleto_pequeno': {
      const sugestao = aviso.nSugeridos.length > 0 ? ` Experimente N = ${aviso.nSugeridos.join(' ou ')}.` : '';
      return `O time incompleto ficou com ${aviso.tamanho} ${aviso.tamanho === 1 ? 'jogador' : 'jogadores'}, menos da metade de N.${sugestao}`;
    }
  }
}
