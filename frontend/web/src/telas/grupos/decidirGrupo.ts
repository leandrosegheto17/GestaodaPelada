import { slug as esquemaSlug, type SessaoEu } from '@pelada/contrato';
import { recursos } from '../../config/recursos';

type GrupoDaSessao = SessaoEu['grupos'][number];

export type DecisaoGrupo =
  | { tipo: 'redirecionar'; para: string }
  | { tipo: 'vazio' }
  /** `grupoSemAcesso`: slug do link que a pessoa não administra (para o aviso), ou `null`. */
  | { tipo: 'lista'; grupoSemAcesso: string | null };

/** Destino de um grupo; com a área do financeiro pedida e o recurso ligado, respeita a permissão. */
export function destinoDoGrupo(grupo: GrupoDaSessao, area?: string | null): string {
  const base = `/admin/${encodeURIComponent(grupo.id)}`;
  if (area !== 'financeiro' || !recursos.ligado('financeiro')) return base;
  return grupo.acessaFinanceiro ? `${base}/financeiro` : `${base}?negado=financeiro`;
}

/**
 * Decide o que a tela de grupos faz. `grupo` (slug do link) é entrada de fora e só vale se passar
 * no schema de slug; o destino sempre usa o `id` da sessão, nunca o texto da URL.
 */
export function decidirGrupo(
  sessao: SessaoEu,
  { grupo, area }: { grupo: string | null; area: string | null },
): DecisaoGrupo {
  if (sessao.grupos.length === 0) return { tipo: 'vazio' };
  const slugDoLink = grupo !== null && esquemaSlug.safeParse(grupo).success ? grupo : null;
  if (slugDoLink !== null) {
    const encontrado = sessao.grupos.find((g) => g.slug === slugDoLink);
    return encontrado
      ? { tipo: 'redirecionar', para: destinoDoGrupo(encontrado, area) }
      : { tipo: 'lista', grupoSemAcesso: slugDoLink };
  }
  const unico = sessao.grupos.length === 1 ? sessao.grupos[0] : undefined;
  return unico ? { tipo: 'redirecionar', para: destinoDoGrupo(unico, area) } : { tipo: 'lista', grupoSemAcesso: null };
}
