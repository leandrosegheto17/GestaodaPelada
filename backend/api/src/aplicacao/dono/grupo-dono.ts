import { grupoDono, type GrupoDono } from '@pelada/contrato';
import type { ExecutorDb } from '../../infraestrutura/db/index.js';
import * as grupos from '../../infraestrutura/db/repositorios/grupos.js';
import * as vinculos from '../../infraestrutura/db/repositorios/vinculos.js';
import { urlPublicaDoGrupo } from '../grupos/url-publica.js';
import { paraMetadadosGrupo } from './metadados-grupo.js';

/** Grupo na visão do dono (inclui arquivado). Inexistente volta como `null`. */
export async function carregarGrupoDono(
  ex: ExecutorDb,
  urlPublica: string,
  grupoId: string,
): Promise<GrupoDono | null> {
  const [grupo, admins] = await Promise.all([grupos.buscarPorId(ex, grupoId), vinculos.adminsDoGrupo(ex, grupoId)]);
  if (!grupo) return null;
  return grupoDono.parse({
    ...paraMetadadosGrupo(grupo),
    slug: grupo.slug,
    urlPublica: urlPublicaDoGrupo(urlPublica, grupo.slug),
    admins: admins.map((a) => ({ contaId: a.contaId, nome: a.nome, email: a.email })),
  });
}
