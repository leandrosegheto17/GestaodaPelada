import type { PartidaDetalhe } from '@pelada/contrato';
import { emTransacao, type Db, type ExecutorDb } from '../../infraestrutura/db/index.js';
import * as auditoria from '../../infraestrutura/db/repositorios/auditoria.js';
import * as eventos from '../../infraestrutura/db/repositorios/eventos.js';
import * as partidas from '../../infraestrutura/db/repositorios/partidas.js';
import { carregarPartida } from './detalhe.js';
import { prepararPresencas, travarMarcados, type Marcacao } from './presencas.js';

export interface DependenciasLancar {
  registrarEvento: (ex: ExecutorDb, grupoId: string, data: string, momento: Date) => Promise<void>;
  registrarAuditoria: typeof auditoria.registrar;
}

const PADRAO: DependenciasLancar = {
  registrarEvento: (ex, grupoId, data, momento) =>
    eventos.registrar(ex, grupoId, { tipo: 'partida_lancada', dataPartida: data, momento }),
  registrarAuditoria: auditoria.registrar,
};

/**
 * Lança a partida: partida, presenças, evento de uso e auditoria numa única transação; qualquer
 * falha desfaz tudo. Data repetida vem do índice único (`PartidaDuplicada`).
 */
export async function lancarPartida(
  db: Db,
  grupoId: string,
  entrada: { data: string; choveu: boolean; marcacoes: readonly Marcacao[] },
  contexto: { autorContaId: string; agora: Date; hoje: string },
  deps: DependenciasLancar = PADRAO,
): Promise<PartidaDetalhe> {
  await emTransacao(db, async (tx) => {
    await travarMarcados(tx, grupoId, entrada.marcacoes);
    const { linhas, contagem } = await prepararPresencas(tx, grupoId, entrada.data, entrada.marcacoes);
    const id = await partidas.criar(tx, grupoId, {
      data: entrada.data,
      choveu: entrada.choveu,
      presencas: linhas,
      autor: contexto.autorContaId,
      agora: contexto.agora,
    });
    await deps.registrarEvento(tx, grupoId, entrada.data, contexto.agora);
    await deps.registrarAuditoria(tx, grupoId, {
      autor: { tipo: 'conta', contaId: contexto.autorContaId },
      acao: 'partida_lancada',
      entidade: 'partida',
      entidadeId: id,
      resumo: { data: entrada.data, choveu: entrada.choveu, ...contagem },
      agora: contexto.agora,
    });
  });
  const partida = await carregarPartida(db, grupoId, entrada.data, contexto.hoje);
  if (!partida) throw new Error('Partida lançada não encontrada.');
  return partida;
}
