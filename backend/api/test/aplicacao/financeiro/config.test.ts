import { sql } from 'kysely';
import { describe, expect, it, vi } from 'vitest';
import { kyselyDe } from '../../../src/infraestrutura/db/cliente.js';
import { salvarConfigFinanceira } from '../../../src/aplicacao/financeiro/config.js';
import * as financeiro from '../../../src/infraestrutura/db/repositorios/financeiro.js';
import { usarDb } from '../../apoio/db-teste.js';
import { usarFabrica } from '../../apoio/fabrica.js';
import { relogioFixo } from '../../apoio/relogio.js';
import { criarBase } from '../../apoio/sql-dados.js';

const fabrica = usarFabrica();
const abrir = usarDb(fabrica);
const relogio = relogioFixo('2026-10-22');
const CORPO = { mensalidadeCentavos: 7_500, saldoInicialCentavos: 35_000, dataSaldoInicial: '2026-02-05' };

const falha = vi.hoisted(() => ({ auditoria: false }));
vi.mock('../../../src/infraestrutura/db/repositorios/auditoria.js', async (original) => {
  const real = await original<typeof import('../../../src/infraestrutura/db/repositorios/auditoria.js')>();
  return {
    ...real,
    registrar: (...args: Parameters<typeof real.registrar>) => {
      if (falha.auditoria) throw new Error('auditoria indisponível');
      return real.registrar(...args);
    },
  };
});

describe('salvarConfigFinanceira', () => {
  it('falha na auditoria desfaz a gravação da configuração', async () => {
    const db = await abrir();
    const base = await criarBase(db, fabrica);
    const contexto = { autorContaId: base.contaId, hoje: relogio.hoje(), agora: new Date(relogio.agoraIso()) };
    falha.auditoria = true;
    try {
      await expect(salvarConfigFinanceira(db, base.grupo.id, CORPO, contexto)).rejects.toThrow('auditoria indisponível');
    } finally {
      falha.auditoria = false;
    }
    expect(await financeiro.lerConfig(db, base.grupo.id)).toBeNull();
  });

  it('gravações concorrentes no mesmo grupo geram auditorias com o anterior encadeado', async () => {
    const db = await abrir();
    const outraConexao = await abrir();
    const base = await criarBase(db, fabrica);
    const contexto = { autorContaId: base.contaId, hoje: relogio.hoje(), agora: new Date(relogio.agoraIso()) };
    const primeira = { ...CORPO, mensalidadeCentavos: 1_000 };
    const segunda = { ...CORPO, mensalidadeCentavos: 2_000 };
    await Promise.all([
      salvarConfigFinanceira(db, base.grupo.id, primeira, contexto),
      salvarConfigFinanceira(outraConexao, base.grupo.id, segunda, contexto),
    ]);
    const r = await sql<{ resumo: Record<string, unknown> }>`
      SELECT resumo FROM auditoria WHERE entidade = 'config_financeira' AND entidade_id = ${base.grupo.id} ORDER BY id
    `.execute(kyselyDe(db));
    expect(r.rows).toHaveLength(2);
    const [a, b] = r.rows.map((l) => l.resumo);
    expect(a?.antesMensalidade).toBeNull();
    expect(b?.antesMensalidade).toBe(a?.depoisMensalidade);
  });
});
