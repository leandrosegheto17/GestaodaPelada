import type { PainelPesos } from '@pelada/contrato';
import { emTransacao, type Db } from '../../infraestrutura/db/index.js';
import * as auditoria from '../../infraestrutura/db/repositorios/auditoria.js';
import * as pesos from '../../infraestrutura/db/repositorios/pesos.js';
import { montarPainelPesos } from './painel.js';

/**
 * Nova configuração de pesos com vigência no "hoje" do servidor (nunca vinda do cliente). Na mesma
 * data, substitui a anterior; configurações de datas passadas não mudam. Audita na mesma transação.
 */
export async function salvarPesos(
  db: Db,
  grupoId: string,
  entrada: { pesos: pesos.Pesos; contaId: string; hoje: string; agora: Date },
): Promise<PainelPesos> {
  await emTransacao(db, async (tx) => {
    const { substituiu } = await pesos.criar(tx, grupoId, {
      pesos: entrada.pesos,
      vigenteDesde: entrada.hoje,
      hoje: entrada.hoje,
      registradoPor: entrada.contaId,
      agora: entrada.agora,
    });
    await auditoria.registrar(tx, grupoId, {
      autor: { tipo: 'conta', contaId: entrada.contaId },
      acao: substituiu ? 'pesos_substituidos' : 'pesos_configurados',
      entidade: 'config_pesos',
      entidadeId: entrada.hoje,
      resumo: { ...entrada.pesos },
      agora: entrada.agora,
    });
  });
  return montarPainelPesos(db, grupoId, entrada.hoje);
}
