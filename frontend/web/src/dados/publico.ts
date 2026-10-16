import { rankingPublico } from '@pelada/contrato';
import { useQuery } from '@tanstack/react-query';
import { ler } from './cliente';

/** `/publico/<slug>/ranking`, com `?mes=` só quando há mês (sem mês, a API escolhe o corrente). */
export function caminhoRanking(slug: string, mes?: string): string {
  const base = `/publico/${encodeURIComponent(slug)}/ranking`;
  return mes ? `${base}?mes=${encodeURIComponent(mes)}` : base;
}

/** `habilitado: false` não consulta (slug já sabidamente inválido). */
export function useRankingPublico(slug: string, mes?: string, habilitado = true) {
  return useQuery({
    queryKey: ['publico', 'ranking', slug, mes ?? 'atual'],
    queryFn: ({ signal }) => ler(caminhoRanking(slug, mes), rankingPublico, { signal }),
    enabled: habilitado,
  });
}
