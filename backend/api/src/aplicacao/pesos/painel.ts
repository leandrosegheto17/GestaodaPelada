import { painelPesos, type PainelPesos } from '@pelada/contrato';
import type { ExecutorDb } from '../../infraestrutura/db/index.js';
import * as pesos from '../../infraestrutura/db/repositorios/pesos.js';

/**
 * Pesos em vigor e histórico (vigência e autor). Todo grupo nasce com pesos (RN-18): uma lista
 * vazia é defeito de dados e vira erro, sem inventar valores.
 */
export async function montarPainelPesos(ex: ExecutorDb, grupoId: string, hoje: string): Promise<PainelPesos> {
  const todos = await pesos.historico(ex, grupoId);
  const vigente = todos.find((c) => c.vigenteAte === null);
  if (!vigente) throw new Error('Grupo sem configuração de pesos.');
  const campos = (c: pesos.ConfigPesosHistorico) => ({
    vigenteDesde: c.vigenteDesde,
    registradoPor: c.registradoPor,
    presencaSemChuva: c.presencaSemChuva,
    presencaComChuva: c.presencaComChuva,
    lesionadoSemChuva: c.lesionadoSemChuva,
    lesionadoComChuva: c.lesionadoComChuva,
    expulso: c.expulso,
  });
  return painelPesos.parse({
    hoje,
    vigente: campos(vigente),
    historico: todos.filter((c) => c !== vigente).map((c) => ({ ...campos(c), vigenteAte: c.vigenteAte })),
  });
}
