import type { MesFinanceiro } from '@pelada/contrato';
import { describe, expect, it } from 'vitest';
import { agruparMensalidades } from './agruparMensalidades';

type Lancamento = MesFinanceiro['lancamentos'][number];

const mensalidade = (id: string, data: string, valorCentavos = 7_500): Lancamento => ({
  id,
  tipo: 'entrada',
  data,
  descricao: `Mensalidade ${id}`,
  valorCentavos,
  mensalidade: true,
});
const avulso = (id: string, data: string, tipo: 'entrada' | 'saida' = 'saida'): Lancamento => ({
  id,
  tipo,
  data,
  descricao: id,
  valorCentavos: 10_000,
  mensalidade: false,
});

describe('agruparMensalidades', () => {
  it('16 mensalidades viram uma linha com período e total, na posição da mais antiga', () => {
    const mensais = Array.from({ length: 16 }, (_, i) =>
      mensalidade(`m${i}`, `2026-10-${String(Math.max(1, 15 - i)).padStart(2, '0')}`),
    );
    const lista = [avulso('bolas', '2026-10-20'), avulso('aluguel', '2026-10-16'), ...mensais];
    const itens = agruparMensalidades(lista, '2026-10');
    expect(itens).toHaveLength(3);
    expect(itens[2]).toMatchObject({
      tipo: 'mensalidades',
      titulo: '16 mensalidades de 10/2026',
      periodo: '01/10 a 15/10',
      totalCentavos: 16 * 7_500,
    });
    expect(itens.slice(0, 2).map((i) => i.tipo)).toEqual(['avulso', 'avulso']);
  });

  it('a linha agrupada fica na posição da mensalidade mais antiga, abaixo do aluguel de 05/10', () => {
    const lista = [
      avulso('bolas', '2026-10-20'),
      mensalidade('b', '2026-10-06'),
      avulso('aluguel', '2026-10-05'),
      mensalidade('a', '2026-10-01'),
    ];
    const itens = agruparMensalidades(lista, '2026-10');
    expect(itens.map((i) => (i.tipo === 'avulso' ? i.lancamento.id : 'grupo'))).toEqual(['bolas', 'aluguel', 'grupo']);
  });

  it('uma só mensalidade: singular e uma data', () => {
    const [item] = agruparMensalidades([mensalidade('a', '2026-10-01')], '2026-10');
    expect(item).toMatchObject({ titulo: '1 mensalidade de 10/2026', periodo: '01/10', totalCentavos: 7_500 });
  });

  it('sem mensalidades: nenhuma linha agrupada e a ordem é preservada', () => {
    const lista = [avulso('x', '2026-10-03'), avulso('y', '2026-10-02', 'entrada')];
    const itens = agruparMensalidades(lista, '2026-10');
    expect(itens.map((i) => i.tipo)).toEqual(['avulso', 'avulso']);
    expect(itens.map((i) => (i.tipo === 'avulso' ? i.lancamento.id : ''))).toEqual(['x', 'y']);
  });

  it('lista vazia: nada', () => {
    expect(agruparMensalidades([], '2026-10')).toEqual([]);
  });
});
