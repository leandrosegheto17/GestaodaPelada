import { slug as esquemaSlug } from '@pelada/contrato';
import type { ExecutorDb } from '../../infraestrutura/db/index.js';
import * as grupos from '../../infraestrutura/db/repositorios/grupos.js';
import type { Grupo } from '../../infraestrutura/db/repositorios/grupos.js';

/**
 * Grupo do link público. Slug malformado, inexistente ou de grupo arquivado voltam todos como
 * `null` (a rota responde o mesmo 404 e ninguém distingue as causas). Slug malformado nem consulta.
 */
export async function buscarGrupoPublico(ex: ExecutorDb, slug: string): Promise<Grupo | null> {
  if (!esquemaSlug.safeParse(slug).success) return null;
  const grupo = await grupos.buscarPorSlug(ex, slug);
  return grupo && grupo.arquivadoEm === null ? grupo : null;
}
