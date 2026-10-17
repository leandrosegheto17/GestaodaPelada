import { describe, expect, it } from 'vitest';
import { entradaDaMensalidade } from './mensalidade.js';

const base = { apelido: 'Toninho', mes: '2026-10', mensalidadeCentavos: 5000, hoje: '2026-10-17' } as const;

describe('entradaDaMensalidade', () => {
  it('monta a entrada com a descrição "Mensalidade <apelido> <mm/aaaa>"', () => {
    expect(entradaDaMensalidade(base)).toEqual({
      tipo: 'entrada',
      data: '2026-10-17',
      descricao: 'Mensalidade Toninho 10/2026',
      valorCentavos: 5000,
    });
  });
  it('mês 01 mantém o zero à esquerda; a data é a de hoje, não a do mês pago', () => {
    const r = entradaDaMensalidade({ ...base, mes: '2026-01' });
    expect(r?.descricao).toBe('Mensalidade Toninho 01/2026');
    expect(r?.data).toBe('2026-10-17');
  });
  it('apelido com acento e 30 caracteres cabe nos 80 da descrição', () => {
    const apelido = 'Êéçãõü'.padEnd(30, 'Á');
    expect(apelido).toHaveLength(30);
    const r = entradaDaMensalidade({ ...base, apelido });
    expect(r?.descricao).toBe(`Mensalidade ${apelido} 10/2026`);
    expect(r!.descricao.length).toBeLessThanOrEqual(80);
  });
  it('sem mensalidade configurada devolve null (só a marcação)', () => {
    expect(entradaDaMensalidade({ ...base, mensalidadeCentavos: null })).toBeNull();
  });
});
