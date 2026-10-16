import { composicaoDois, composicaoVarios, type EscalacaoCorpo } from '@pelada/contrato';

type CorpoDois = Extract<EscalacaoCorpo, { formato: 'dois_times' }>;
type CorpoVarios = Extract<EscalacaoCorpo, { formato: 'varios_times' }>;

/** Formato e composição de uma escalação, como o contrato os define. */
export type Escalada = Pick<CorpoDois, 'formato' | 'composicao'> | Pick<CorpoVarios, 'formato' | 'composicao'>;

/** Ids que aparecem na composição: titulares, reservas e "não entra" (dois times), ou todos os times. */
export function idsDaComposicao(escalada: Escalada): string[] {
  if (escalada.formato === 'varios_times') return escalada.composicao.times.flatMap((t) => t.jogadores);
  const { times, naoEntra } = escalada.composicao;
  return [...times.flatMap((t) => [...t.titulares, ...t.entramNo2oTempo].map((j) => j.id)), ...naoEntra];
}

/** Valida o `jsonb` lido do banco com o schema do contrato; forma inválida volta `null`. */
export function lerComposicao(formato: 'dois_times' | 'varios_times', json: unknown): Escalada | null {
  if (formato === 'varios_times') {
    const lida = composicaoVarios.safeParse(json);
    return lida.success ? { formato, composicao: lida.data } : null;
  }
  const lida = composicaoDois.safeParse(json);
  return lida.success ? { formato, composicao: lida.data } : null;
}
