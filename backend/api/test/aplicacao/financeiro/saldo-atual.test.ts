import { describe, expect, it } from 'vitest';
import { carregarSaldoAtual } from '../../../src/aplicacao/financeiro/saldo-atual.js';
import { usarDb } from '../../apoio/db-teste.js';
import { criarConfig, criarLancamento } from '../../apoio/fabricas/financeiro.js';
import { usarFabrica } from '../../apoio/fabrica.js';
import { criarBase } from '../../apoio/sql-dados.js';

const fabrica = usarFabrica();
const abrir = usarDb(fabrica);

describe('carregarSaldoAtual', () => {
  it('sem configuração: nulo', async () => {
    const db = await abrir();
    const base = await criarBase(db, fabrica);
    expect(await carregarSaldoAtual(db, base.grupo.id, '2026-10-22')).toBeNull();
  });

  it('saldo inicial + entradas − saídas desde a data do saldo até hoje, sem os lançamentos de fora', async () => {
    const db = await abrir();
    const base = await criarBase(db, fabrica);
    const g = base.grupo.id;
    await criarConfig(db, g, { saldoInicialCentavos: 35_000, dataSaldoInicial: '2026-02-05' });
    await criarLancamento(db, g, base.contaId, { tipo: 'entrada', data: '2026-02-05', valorCentavos: 10_000 });
    await criarLancamento(db, g, base.contaId, { tipo: 'saida', data: '2026-02-04', valorCentavos: 9_999 });
    await criarLancamento(db, g, base.contaId, { tipo: 'saida', data: '2026-10-22', valorCentavos: 4_000 });
    await criarLancamento(db, g, base.contaId, { tipo: 'entrada', data: '2026-10-23', valorCentavos: 777 });
    expect(await carregarSaldoAtual(db, g, '2026-10-22')).toBe(35_000 + 10_000 - 4_000);
  });

  it('hoje antes da data do saldo: só o saldo inicial; saldo pode ser negativo', async () => {
    const db = await abrir();
    const base = await criarBase(db, fabrica);
    const g = base.grupo.id;
    await criarConfig(db, g, { saldoInicialCentavos: -2_000, dataSaldoInicial: '2026-11-01' });
    expect(await carregarSaldoAtual(db, g, '2026-10-22')).toBe(-2_000);
  });

  it('o lançamento de outro grupo não entra', async () => {
    const db = await abrir();
    const base = await criarBase(db, fabrica);
    await criarConfig(db, base.grupo.id, { saldoInicialCentavos: 100, dataSaldoInicial: '2026-02-05' });
    await criarLancamento(db, base.outroGrupo.id, base.contaId, { tipo: 'entrada', data: '2026-10-01' });
    expect(await carregarSaldoAtual(db, base.grupo.id, '2026-10-22')).toBe(100);
  });
});
