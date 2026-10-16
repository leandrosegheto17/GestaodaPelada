/**
 * Slug do link público do grupo. Gerado uma vez na criação e nunca mais alterado:
 * renomear o grupo não muda o link.
 */
const LIMITE_BASE = 40;
const MINIMO_BASE = 3;
const PADRAO = 'grupo';

/** Palavras que colidiriam com rotas do app. */
const RESERVADAS: ReadonlySet<string> = new Set([
  'admin',
  'api',
  'dono',
  'entrar',
  'g',
  'privacidade',
  'conta',
  'assets',
  'well-known',
]);

/** Texto sem acento, minúsculo, só `[a-z0-9-]`, hífens únicos e sem hífen nas pontas. */
export function slugBase(nome: string): string {
  const limpo = nome
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, LIMITE_BASE)
    .replace(/-+$/g, '');
  if (limpo.length < MINIMO_BASE) return PADRAO;
  return RESERVADAS.has(limpo) ? `${limpo}-${PADRAO}` : limpo;
}

/**
 * Gera o slug do nome; se já existe em `usados` (inclusive de grupos arquivados),
 * acrescenta `-2`, `-3`… até achar um livre.
 */
export function gerarSlug(nome: string, usados: ReadonlySet<string>): string {
  const base = slugBase(nome);
  if (!usados.has(base)) return base;
  const limite = usados.size + 2;
  for (let n = 2; n <= limite; n++) {
    const candidato = `${base}-${n}`;
    if (!usados.has(candidato)) return candidato;
  }
  return `${base}-${limite + 1}`;
}
