import { mes as esquemaMes, slug as esquemaSlug, uuid as esquemaUuid } from '@pelada/contrato';
import { apagar, gravar, ler } from './banco-local';

/**
 * Memória do aparelho (ADR-009): só slug, id anônimo, projeção pública do ranking e um booleano.
 * Nunca sessão, conta ou dado de grupo privado. Tudo que é lido é entrada não confiável.
 */

const CHAVE_GRUPO = 'grupo-lembrado';
const CHAVE_ID = 'id-anonimo';
const CHAVE_AVISO = 'aviso-instalacao-fechado';

const slugValido = (valor: unknown): valor is string => esquemaSlug.safeParse(valor).success;
const mesValido = (valor: unknown): valor is string => esquemaMes.safeParse(valor).success;

export async function grupoLembrado(): Promise<string | null> {
  const valor = await ler(CHAVE_GRUPO);
  if (slugValido(valor)) return valor;
  // O armazenamento é entrada de fora: valor malformado é esquecido.
  if (valor !== undefined) await apagar(CHAVE_GRUPO);
  return null;
}

export async function lembrarGrupo(slug: string): Promise<void> {
  if (!slugValido(slug)) return;
  await gravar(CHAVE_GRUPO, slug);
}

export async function esquecerGrupo(): Promise<void> {
  await apagar(CHAVE_GRUPO);
}

let idEmAndamento: Promise<string> | null = null;

async function resolverId(): Promise<string> {
  const existente = await ler(CHAVE_ID);
  if (typeof existente === 'string' && esquemaUuid.safeParse(existente).success) return existente;
  const novo = crypto.randomUUID();
  await gravar(CHAVE_ID, novo);
  return novo;
}

/** Identificador anônimo, gerado uma vez; chamadas simultâneas devolvem o mesmo. */
export function idAnonimo(): Promise<string> {
  idEmAndamento ??= resolverId().finally(() => {
    idEmAndamento = null;
  });
  return idEmAndamento;
}

export interface UltimoRanking {
  geradoEm: string;
  /** Resposta pública já recebida; quem lê valida com o contrato antes de usar. */
  dados: unknown;
}

const chaveRanking = (slug: string, mes: string) => `ranking:${slug}:${mes}`;

export async function guardarUltimoRanking(slug: string, mes: string, ranking: UltimoRanking): Promise<void> {
  if (!slugValido(slug) || !mesValido(mes)) return;
  await gravar(chaveRanking(slug, mes), { geradoEm: ranking.geradoEm, dados: ranking.dados });
}

export async function ultimoRanking(slug: string, mes: string): Promise<UltimoRanking | null> {
  if (!slugValido(slug) || !mesValido(mes)) return null;
  return comoUltimoRanking(await ler(chaveRanking(slug, mes)));
}

const chaveRankingAtual = (slug: string) => `ranking:${slug}:atual`;

/** Último ranking aberto sem `?mes=` (o mês corrente é decidido pela API, nunca pelo aparelho). */
export async function guardarRankingAtual(slug: string, ranking: UltimoRanking): Promise<void> {
  if (!slugValido(slug)) return;
  await gravar(chaveRankingAtual(slug), { geradoEm: ranking.geradoEm, dados: ranking.dados });
}

export async function rankingAtual(slug: string): Promise<UltimoRanking | null> {
  if (!slugValido(slug)) return null;
  return comoUltimoRanking(await ler(chaveRankingAtual(slug)));
}

function comoUltimoRanking(valor: unknown): UltimoRanking | null {
  if (typeof valor !== 'object' || valor === null || !('geradoEm' in valor) || !('dados' in valor)) return null;
  return typeof valor.geradoEm === 'string' ? { geradoEm: valor.geradoEm, dados: valor.dados } : null;
}

export async function avisoInstalacaoFechado(): Promise<boolean> {
  return (await ler(CHAVE_AVISO)) === true;
}

export async function fecharAvisoInstalacao(): Promise<void> {
  await gravar(CHAVE_AVISO, true);
}
