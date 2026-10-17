import { lancamento, type Lancamento } from '@pelada/contrato';
import type { LancamentoCompleto } from '../../../infraestrutura/db/repositorios/financeiro.js';

/** Linha do repositório na forma do contrato (único lugar da conversão; valida antes de sair). */
export function paraLancamento(l: LancamentoCompleto): Lancamento {
  return lancamento.parse({
    id: l.id,
    tipo: l.tipo,
    data: l.data,
    descricao: l.descricao,
    valorCentavos: l.valorCentavos,
    mensalidade: l.mensalidade,
    alteradoPor: l.alteradoPor,
    alteradoEm: l.alteradoEm.toISOString(),
  });
}
