import type { Habilidade } from '@pelada/contrato';
import type { Db } from '../../infraestrutura/db/index.js';
import * as habilidades from '../../infraestrutura/db/repositorios/habilidades.js';
import { NomeHabilidadeEmUso } from '../../infraestrutura/db/repositorios/habilidades.js';
import { MSG_HABILIDADE_EM_USO } from './mensagens.js';

export type FalhaDeCampos = { ok: false; campos: Record<string, string> };
export type ResultadoHabilidade = { ok: true; habilidade: Habilidade } | FalhaDeCampos;

/** Traduz o conflito de nome (índice único sem caixa) no erro de validação do campo `nome`. */
export async function comNomeUnico<T>(escrita: () => Promise<T>): Promise<T | FalhaDeCampos> {
  try {
    return await escrita();
  } catch (erro) {
    if (erro instanceof NomeHabilidadeEmUso) return { ok: false, campos: { nome: MSG_HABILIDADE_EM_USO } };
    throw erro;
  }
}

/** Só o nome muda; as notas continuam. `null` = a habilidade não é deste grupo. */
export async function renomearHabilidade(
  db: Db,
  grupoId: string,
  habilidadeId: string,
  nome: string,
): Promise<ResultadoHabilidade | null> {
  return comNomeUnico(async () => {
    const achou = await habilidades.renomear(db, grupoId, habilidadeId, nome);
    return achou ? { ok: true as const, habilidade: { id: habilidadeId, nome } } : null;
  });
}

/** Uma só escrita: a unicidade do nome é decidida pelo índice do banco, sem consulta prévia. */
export async function criarHabilidade(db: Db, grupoId: string, nome: string): Promise<ResultadoHabilidade> {
  return comNomeUnico(async () => {
    const id = await habilidades.criar(db, grupoId, nome);
    return { ok: true as const, habilidade: { id, nome } };
  });
}
