import { validarPeriodos } from '@pelada/dominio';
import type { JogadorDetalhe } from '@pelada/contrato';
import type { Db } from '../../infraestrutura/db/index.js';
import * as jogadores from '../../infraestrutura/db/repositorios/jogadores.js';
import { JaAtivo } from '../../infraestrutura/db/repositorios/jogadores.js';
import { carregarDetalhe } from './detalhe.js';

export type ResultadoReativar =
  | { tipo: 'ok'; jogador: JogadorDetalhe }
  | { tipo: 'nao_encontrado' }
  | { tipo: 'ja_ativo' }
  | { tipo: 'data_invalida' };

/** Abre um novo período a partir de hoje; o acumulado anterior continua valendo. */
export async function reativarJogador(
  db: Db,
  grupoId: string,
  jogadorId: string,
  hoje: string,
): Promise<ResultadoReativar> {
  const jogador = await jogadores.buscar(db, grupoId, jogadorId);
  if (!jogador) return { tipo: 'nao_encontrado' };
  if (jogador.periodos.some((p) => p.fim === null)) return { tipo: 'ja_ativo' };
  if (!validarPeriodos([...jogador.periodos, { inicio: hoje, fim: null }]).ok) return { tipo: 'data_invalida' };
  try {
    if ((await jogadores.reativar(db, grupoId, jogadorId, hoje)) === null) return { tipo: 'data_invalida' };
  } catch (erro) {
    if (erro instanceof JaAtivo) return { tipo: 'ja_ativo' };
    throw erro;
  }
  const atualizado = await carregarDetalhe(db, grupoId, jogadorId, hoje);
  return atualizado ? { tipo: 'ok', jogador: atualizado } : { tipo: 'nao_encontrado' };
}
