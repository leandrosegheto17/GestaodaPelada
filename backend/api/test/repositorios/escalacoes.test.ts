import { describe, expect, it } from 'vitest';
import { emTransacao } from '../../src/infraestrutura/db/index.js';
import * as escalacoes from '../../src/infraestrutura/db/repositorios/escalacoes.js';
import { usarDb } from '../apoio/db-teste.js';
import { criarConta } from '../apoio/fabricas/contas.js';
import { criarEscalacao } from '../apoio/fabricas/escalacoes.js';
import { usarFabrica } from '../apoio/fabrica.js';
import { criarBase } from '../apoio/sql-dados.js';
import { executarSql } from '../apoio/sql.js';

const fabrica = usarFabrica();
const abrir = usarDb(fabrica);

const composicao = { times: [{ titulares: ['a', 'b'], entram: [] }], naoEntra: ['c'] };

describe('repositório de escalações', () => {
  it('confirma e lê por data, com a data em AAAA-MM-DD e a composição igual', async () => {
    const db = await abrir();
    const base = await criarBase(db, fabrica);
    const gravada = await criarEscalacao(db, fabrica, base.grupo.id, base.contaId, { composicao });
    const lida = await escalacoes.porData(db, base.grupo.id, gravada.data);
    expect(lida).toMatchObject({ ...gravada, composicao });
    expect(lida?.data).toBe('2026-10-22');
  });

  it('confirmar de novo na mesma data substitui a anterior (uma só linha)', async () => {
    const db = await abrir();
    const base = await criarBase(db, fabrica);
    const outra = await criarConta(db, fabrica);
    await criarEscalacao(db, fabrica, base.grupo.id, base.contaId);
    const depois = new Date('2026-10-17T09:00:00Z');
    await escalacoes.confirmar(db, base.grupo.id, {
      data: '2026-10-22',
      formato: 'varios_times',
      n: 4,
      k: null,
      composicao,
      confirmadaPor: outra.id,
      confirmadaEm: depois,
    });
    const linhas = await executarSql('SELECT id FROM escalacoes WHERE grupo_id = $1', [base.grupo.id]);
    expect(linhas).toHaveLength(1);
    expect(await escalacoes.porData(db, base.grupo.id, '2026-10-22')).toMatchObject({
      formato: 'varios_times',
      n: 4,
      k: null,
      confirmadaPor: outra.id,
      confirmadaEm: depois,
    });
  });

  it('k nulo em dois times volta nulo; data sem escalação volta null', async () => {
    const db = await abrir();
    const base = await criarBase(db, fabrica);
    await criarEscalacao(db, fabrica, base.grupo.id, base.contaId, { k: null });
    expect((await escalacoes.porData(db, base.grupo.id, '2026-10-22'))?.k).toBeNull();
    expect(await escalacoes.porData(db, base.grupo.id, '2026-10-23')).toBeNull();
  });

  it('isolamento: a escalação de B não aparece em A e confirmar em A não altera a de B', async () => {
    const db = await abrir();
    const base = await criarBase(db, fabrica);
    await criarEscalacao(db, fabrica, base.outroGrupo.id, base.contaId, { n: 9, k: 0 });
    expect(await escalacoes.porData(db, base.grupo.id, '2026-10-22')).toBeNull();
    await criarEscalacao(db, fabrica, base.grupo.id, base.contaId, { n: 5 });
    expect(await escalacoes.porData(db, base.outroGrupo.id, '2026-10-22')).toMatchObject({ n: 9, k: 0 });
  });

  it('dentro de uma transação desfeita, nada é gravado', async () => {
    const db = await abrir();
    const base = await criarBase(db, fabrica);
    await expect(
      emTransacao(db, async (tx) => {
        await escalacoes.confirmar(tx, base.grupo.id, {
          data: '2026-10-22',
          formato: 'dois_times',
          n: 7,
          k: 2,
          composicao,
          confirmadaPor: base.contaId,
          confirmadaEm: new Date('2026-10-16T12:00:00Z'),
        });
        throw new Error('desfaz');
      }),
    ).rejects.toThrow('desfaz');
    expect(await escalacoes.porData(db, base.grupo.id, '2026-10-22')).toBeNull();
  });
});
