import type { MesFinanceiro } from '@pelada/contrato';
import { diaMes, mesNumerico } from '../../formatacao';

type Lancamento = MesFinanceiro['lancamentos'][number];

export type ItemDeLancamento =
  | { tipo: 'avulso'; lancamento: Lancamento }
  | {
      tipo: 'mensalidades';
      /** "16 mensalidades de 10/2026". */
      titulo: string;
      /** "01/10 a 15/10" (ou "01/10" se for uma data só). */
      periodo: string;
      /** Soma dos valores recebidos; só apresentação. */
      totalCentavos: number;
      itens: Lancamento[];
    };

/**
 * As entradas de mensalidade do mês viram uma linha só, na posição da mais antiga (a lista chega da mais
 * recente para a mais antiga). Os outros lançamentos seguem na ordem recebida. Só apresentação: a API já
 * entregou cada lançamento e o vínculo.
 */
export function agruparMensalidades(lancamentos: readonly Lancamento[], mes: string): ItemDeLancamento[] {
  const mensalidades = lancamentos.filter((l) => l.mensalidade);
  if (mensalidades.length === 0) return lancamentos.map((lancamento) => ({ tipo: 'avulso', lancamento }));

  const datas = mensalidades.map((l) => l.data).sort();
  const primeira = datas[0] as string;
  const ultima = datas[datas.length - 1] as string;
  const grupo: ItemDeLancamento = {
    tipo: 'mensalidades',
    titulo: `${mensalidades.length} ${mensalidades.length === 1 ? 'mensalidade' : 'mensalidades'} de ${mesNumerico(mes)}`,
    periodo: primeira === ultima ? diaMes(primeira) : `${diaMes(primeira)} a ${diaMes(ultima)}`,
    totalCentavos: mensalidades.reduce((soma, l) => soma + l.valorCentavos, 0),
    itens: mensalidades,
  };
  const posicaoDoGrupo = lancamentos.lastIndexOf(mensalidades[mensalidades.length - 1] as Lancamento);
  return lancamentos.flatMap((lancamento, i): ItemDeLancamento[] => {
    if (!lancamento.mensalidade) return [{ tipo: 'avulso', lancamento }];
    return i === posicaoDoGrupo ? [grupo] : [];
  });
}
