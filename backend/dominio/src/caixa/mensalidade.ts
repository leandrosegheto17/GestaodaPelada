import type { Data, Mes } from '../datas/datas.js';

export interface EntradaDaMensalidade {
  tipo: 'entrada';
  data: Data;
  descricao: string;
  valorCentavos: number;
}

/**
 * Lançamento de entrada criado ao marcar o pagamento da mensalidade. A data é a de hoje (regime de caixa:
 * o dinheiro entra no dia em que é marcado). Sem mensalidade configurada, só a marcação vale: `null`.
 */
export function entradaDaMensalidade(entrada: {
  apelido: string;
  mes: Mes;
  mensalidadeCentavos: number | null;
  hoje: Data;
}): EntradaDaMensalidade | null {
  if (entrada.mensalidadeCentavos === null) return null;
  const [ano, mes] = entrada.mes.split('-');
  return {
    tipo: 'entrada',
    data: entrada.hoje,
    descricao: `Mensalidade ${entrada.apelido} ${mes}/${ano}`,
    valorCentavos: entrada.mensalidadeCentavos,
  };
}
