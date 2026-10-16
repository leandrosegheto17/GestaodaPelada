import type { PartidaDetalhe } from '@pelada/contrato';
import { emTransacao, type Db } from '../../infraestrutura/db/index.js';
import * as auditoria from '../../infraestrutura/db/repositorios/auditoria.js';
import * as partidas from '../../infraestrutura/db/repositorios/partidas.js';
import { carregarPartida } from './detalhe.js';
import { prepararPresencas, type Marcacao } from './presencas.js';

export class PartidaNaoEncontrada extends Error {
  constructor() {
    super('Partida não encontrada.');
  }
}

/**
 * Substitui `choveu` e as presenças da partida da data (a data não muda), com auditoria, tudo
 * numa transação. Os ativos considerados são os da data da partida, não os de hoje.
 */
export async function editarPartida(
  db: Db,
  grupoId: string,
  data: string,
  entrada: { choveu: boolean; marcacoes: readonly Marcacao[] },
  contexto: { autorContaId: string; agora: Date; hoje: string },
): Promise<PartidaDetalhe> {
  await emTransacao(db, async (tx) => {
    const { linhas, contagem } = await prepararPresencas(tx, grupoId, data, entrada.marcacoes);
    const alterada = await partidas.substituir(tx, grupoId, data, {
      choveu: entrada.choveu,
      presencas: linhas,
      autor: contexto.autorContaId,
      agora: contexto.agora,
    });
    if (!alterada) throw new PartidaNaoEncontrada();
    await auditoria.registrar(tx, grupoId, {
      autor: { tipo: 'conta', contaId: contexto.autorContaId },
      acao: 'partida_editada',
      entidade: 'partida',
      entidadeId: data,
      resumo: { data, choveu: entrada.choveu, ...contagem },
      agora: contexto.agora,
    });
  });
  const partida = await carregarPartida(db, grupoId, data, contexto.hoje);
  if (!partida) throw new PartidaNaoEncontrada();
  return partida;
}
