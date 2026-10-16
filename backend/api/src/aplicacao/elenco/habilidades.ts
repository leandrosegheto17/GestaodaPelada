import type { Habilidade } from '@pelada/contrato';
import { emTransacao, type Db } from '../../infraestrutura/db/index.js';
import * as auditoria from '../../infraestrutura/db/repositorios/auditoria.js';
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

/**
 * Apaga a habilidade e, por cascata do banco, as notas dela; a auditoria entra na mesma transação.
 * `null` = a habilidade não é deste grupo (nada é escrito).
 */
export async function excluirHabilidade(
  db: Db,
  grupoId: string,
  habilidadeId: string,
  contexto: { autorContaId: string; agora: Date },
): Promise<{ nome: string } | null> {
  return emTransacao(db, async (tx) => {
    const nome = (await habilidades.listar(tx, grupoId)).find((h) => h.id === habilidadeId)?.nome;
    if (nome === undefined) return null;
    if (!(await habilidades.excluir(tx, grupoId, habilidadeId))) return null;
    await auditoria.registrar(tx, grupoId, {
      autor: { tipo: 'conta', contaId: contexto.autorContaId },
      acao: 'habilidade_excluida',
      entidade: 'habilidade',
      entidadeId: habilidadeId,
      resumo: { nome },
      agora: contexto.agora,
    });
    return { nome };
  });
}

/** Uma só escrita: a unicidade do nome é decidida pelo índice do banco, sem consulta prévia. */
export async function criarHabilidade(db: Db, grupoId: string, nome: string): Promise<ResultadoHabilidade> {
  return comNomeUnico(async () => {
    const id = await habilidades.criar(db, grupoId, nome);
    return { ok: true as const, habilidade: { id, nome } };
  });
}
