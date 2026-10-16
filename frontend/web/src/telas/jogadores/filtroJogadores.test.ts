import { describe, expect, it } from 'vitest';
import { filtrarPorBusca, lerFiltro } from './filtroJogadores';

describe('lerFiltro', () => {
  it.each([
    ['', 'ativos'],
    ['filtro=ativos', 'ativos'],
    ['filtro=inativos', 'inativos'],
    ['filtro=INATIVOS', 'ativos'],
    ['filtro=x', 'ativos'],
    ['filtro=a&filtro=inativos', 'ativos'],
    ['filtro=inativos&filtro=ativos', 'inativos'],
  ])('%j → %s', (consulta, esperado) => {
    expect(lerFiltro(new URLSearchParams(consulta))).toBe(esperado);
  });
});

describe('filtrarPorBusca', () => {
  const itens = [{ apelido: 'Léo Baiano' }, { apelido: 'Zé Carlos' }, { apelido: 'Bigode' }];

  it('ignora caixa e acento e mantém a ordem', () => {
    expect(filtrarPorBusca(itens, 'leo')).toEqual([{ apelido: 'Léo Baiano' }]);
    expect(filtrarPorBusca(itens, 'ZÉ')).toEqual([{ apelido: 'Zé Carlos' }]);
    expect(filtrarPorBusca(itens, ' o ').map((i) => i.apelido)).toEqual(['Léo Baiano', 'Zé Carlos', 'Bigode']);
  });

  it('termo vazio devolve todos; termo longo não quebra', () => {
    expect(filtrarPorBusca(itens, '')).toHaveLength(3);
    expect(filtrarPorBusca(itens, 'a'.repeat(200))).toEqual([]);
  });
});
