import { validarPeriodos } from '@pelada/dominio';
import type { JogadorDetalhe } from '@pelada/contrato';
import type { Db } from '../../infraestrutura/db/index.js';
import * as jogadores from '../../infraestrutura/db/repositorios/jogadores.js';
import { PeriodoInvalido } from '../../infraestrutura/db/repositorios/jogadores.js';
import { carregarDetalhe } from './detalhe.js';

export type ResultadoInativar =
  | { tipo: 'ok'; jogador: JogadorDetalhe }
  | { tipo: 'nao_encontrado' }
  | { tipo: 'ja_inativo' }
  | { tipo: 'saida_antes_da_entrada' }
  | { tipo: 'presenca_desde_a_saida' };

/**
 * Fecha o período aberto na data de saída: a partir dessa data o jogador sai das linhas do
 * ranking e do lançamento (intervalo semiaberto). Presenças e pontos já acumulados ficam.
 */
export async function inativarJogador(
  db: Db,
  grupoId: string,
  jogadorId: string,
  dataSaida: string,
  hoje: string,
): Promise<ResultadoInativar> {
  const jogador = await jogadores.buscar(db, grupoId, jogadorId);
  if (!jogador) return { tipo: 'nao_encontrado' };
  const aberto = jogador.periodos.findIndex((p) => p.fim === null);
  if (aberto < 0) return { tipo: 'ja_inativo' };
  const fechado = jogador.periodos.map((p, i) => (i === aberto ? { ...p, fim: dataSaida } : p));
  if (!validarPeriodos(fechado).ok) return { tipo: 'saida_antes_da_entrada' };
  if (await jogadores.temPresencaDesde(db, grupoId, jogadorId, dataSaida)) return { tipo: 'presenca_desde_a_saida' };
  try {
    const r = await jogadores.inativar(db, grupoId, jogadorId, dataSaida);
    if (r === 'sem_periodo_aberto') return { tipo: 'ja_inativo' };
  } catch (erro) {
    if (erro instanceof PeriodoInvalido) return { tipo: 'saida_antes_da_entrada' };
    throw erro;
  }
  const atualizado = await carregarDetalhe(db, grupoId, jogadorId, hoje);
  return atualizado ? { tipo: 'ok', jogador: atualizado } : { tipo: 'nao_encontrado' };
}
