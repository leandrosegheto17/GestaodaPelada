import { describe, expect, it, vi } from 'vitest';
import { criarLancamento } from '../../../../src/aplicacao/financeiro/lancamentos/criar.js';
import * as auditoria from '../../../../src/infraestrutura/db/repositorios/auditoria.js';
import * as financeiro from '../../../../src/infraestrutura/db/repositorios/financeiro.js';
import { usarDb } from '../../../apoio/db-teste.js';
import { usarFabrica } from '../../../apoio/fabrica.js';
import { criarBase } from '../../../apoio/sql-dados.js';

const fabrica = usarFabrica();
const abrir = usarDb(fabrica);
const CORPO = { tipo: 'saida', data: '2026-10-05', descricao: 'Aluguel', valorCentavos: 80_000 } as const;
const AGORA = new Date('2026-10-22T15:00:00.000Z');

const todos = (db: Awaited<ReturnType<typeof abrir>>, g: string) =>
  financeiro.lancamentosDoMes(db, g, '2026-01-01', '2026-12-31');

describe('criarLancamento (aplicação)', () => {
  it('grava no grupo do caminho, devolve a forma do contrato e não leva a descrição na auditoria', async () => {
    const db = await abrir();
    const base = await criarBase(db, fabrica);
    const criado = await criarLancamento(db, base.grupo.id, CORPO, { autorContaId: base.contaId, agora: AGORA });
    expect(criado).toMatchObject({ tipo: 'saida', valorCentavos: 80_000, mensalidade: false });
    expect(await todos(db, base.grupo.id)).toHaveLength(1);
  });

  it('falha na auditoria desfaz o lançamento', async () => {
    const db = await abrir();
    const base = await criarBase(db, fabrica);
    const espiao = vi.spyOn(auditoria, 'registrar').mockRejectedValueOnce(new Error('auditoria fora'));
    await expect(
      criarLancamento(db, base.grupo.id, CORPO, { autorContaId: base.contaId, agora: AGORA }),
    ).rejects.toThrow('auditoria fora');
    espiao.mockRestore();
    expect(await todos(db, base.grupo.id)).toEqual([]);
  });
});
