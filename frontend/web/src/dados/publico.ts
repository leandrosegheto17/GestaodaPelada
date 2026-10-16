import { rankingPublico, type RankingPublico } from '@pelada/contrato';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  guardarRankingAtual,
  guardarUltimoRanking,
  lembrarGrupo,
  rankingAtual,
  ultimoRanking,
} from '../pwa/armazenamento';
import { lerComMeta } from './cliente';
import { ErroApi } from './erros';
import { registrarAbertura } from './eventos';

/** `/publico/<slug>/ranking`, com `?mes=` só quando há mês (sem mês, a API escolhe o corrente). */
export function caminhoRanking(slug: string, mes?: string): string {
  const base = `/publico/${encodeURIComponent(slug)}/ranking`;
  return mes ? `${base}?mes=${encodeURIComponent(mes)}` : base;
}

export type EstadoRanking =
  | { tipo: 'carregando' }
  | { tipo: 'indisponivel' }
  | { tipo: 'erro'; tentarDeNovo: () => void }
  | {
      tipo: 'pronto';
      ranking: RankingPublico;
      /** Mostrando o guardado no aparelho enquanto a rede responde. */
      atualizando: boolean;
      /** `geradoEm` do ranking exibido quando não há rede; `null` quando está atualizado. */
      semConexaoDesde: string | null;
    };

/** O guardado no aparelho é entrada de fora: passa de novo pelo contrato antes de ser exibido. */
async function lerGuardado(slug: string, mes: string | undefined): Promise<RankingPublico | null> {
  const guardado = mes ? await ultimoRanking(slug, mes) : await rankingAtual(slug);
  const analise = rankingPublico.safeParse(guardado?.dados);
  return analise.success ? analise.data : null;
}

/**
 * Ranking público com o último guardado no aparelho: abre na hora com o guardado e troca quando a
 * rede responde; sem rede, mostra o guardado e a hora em que foi gerado. `habilitado: false` não consulta.
 */
export function useRankingComCache(slug: string, mes?: string, habilitado = true): EstadoRanking {
  const consulta = useQuery({
    queryKey: ['publico', 'ranking', slug, mes ?? 'atual'],
    queryFn: ({ signal }) => lerComMeta(caminhoRanking(slug, mes), rankingPublico, { signal }),
    enabled: habilitado,
  });

  const [guardado, setGuardado] = useState<RankingPublico | null | undefined>(undefined);
  useEffect(() => {
    if (!habilitado) return;
    let ativo = true;
    setGuardado(undefined);
    lerGuardado(slug, mes)
      .catch(() => null)
      .then((lido) => {
        if (ativo) setGuardado(lido);
      });
    return () => {
      ativo = false;
    };
  }, [slug, mes, habilitado]);

  const fresco = consulta.data && !consulta.data.doCache ? consulta.data.dados : null;
  useEffect(() => {
    if (!fresco) return;
    const registro = { geradoEm: fresco.geradoEm, dados: fresco };
    void guardarUltimoRanking(slug, fresco.mes, registro).catch(() => undefined);
    if (!mes) void guardarRankingAtual(slug, registro).catch(() => undefined);
    void lembrarGrupo(slug).catch(() => undefined);
    registrarAbertura(slug);
  }, [fresco, slug, mes]);

  if (consulta.data) {
    const { dados, doCache } = consulta.data;
    return { tipo: 'pronto', ranking: dados, atualizando: false, semConexaoDesde: doCache ? dados.geradoEm : null };
  }
  if (consulta.error instanceof ErroApi && consulta.error.status === 404) return { tipo: 'indisponivel' };
  if (consulta.isError) {
    return guardado
      ? { tipo: 'pronto', ranking: guardado, atualizando: false, semConexaoDesde: guardado.geradoEm }
      : { tipo: 'erro', tentarDeNovo: () => void consulta.refetch() };
  }
  return guardado
    ? { tipo: 'pronto', ranking: guardado, atualizando: true, semConexaoDesde: null }
    : { tipo: 'carregando' };
}
