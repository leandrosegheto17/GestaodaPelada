import { describe, expect, it } from 'vitest';
import { usarDb } from '../apoio/db-teste.js';
import { usarFabrica } from '../apoio/fabrica.js';
import { criarBase } from '../apoio/sql-dados.js';
import { codigoDoErro, executarSql } from '../apoio/sql.js';

const fabrica = usarFabrica();
const abrir = usarDb(fabrica);
const AGORA = '2026-10-16T12:00:00Z';
const SEM_ID = '00000000-0000-4000-8000-000000000000';

interface Linha {
  grupoId: string;
  data?: string;
  formato?: string;
  n?: number;
  k?: number | null;
  composicao?: string | null;
  confirmadaPor: string;
}

async function inserir(l: Linha): Promise<void> {
  await executarSql(
    `INSERT INTO escalacoes (grupo_id, data, formato, n, k, composicao, confirmada_por, confirmada_em)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)`,
    [
      l.grupoId,
      l.data ?? '2026-10-22',
      l.formato ?? 'dois_times',
      l.n ?? 7,
      l.k === undefined ? 2 : l.k,
      l.composicao === undefined ? '{}' : l.composicao,
      l.confirmadaPor,
      AGORA,
    ],
  );
}

async function comLimpeza() {
  const base = await criarBase(await abrir(), fabrica);
  fabrica.registrar(async () => {
    await executarSql('DELETE FROM escalacoes WHERE grupo_id = ANY($1)', [[base.grupo.id, base.outroGrupo.id]]);
  });
  return base;
}

describe('migração de escalações', () => {
  it('aceita os dois formatos; k nulo em dois times (ilimitado) é aceito', async () => {
    const base = await comLimpeza();
    const comum = { grupoId: base.grupo.id, confirmadaPor: base.contaId };
    expect(await codigoDoErro(inserir({ ...comum, data: '2026-10-22' }))).toBeNull();
    expect(await codigoDoErro(inserir({ ...comum, data: '2026-10-23', k: null }))).toBeNull();
    expect(await codigoDoErro(inserir({ ...comum, data: '2026-10-24', formato: 'varios_times', k: null }))).toBeNull();
  });

  it('única por grupo e data; a mesma data em outro grupo é aceita', async () => {
    const base = await comLimpeza();
    await inserir({ grupoId: base.grupo.id, confirmadaPor: base.contaId });
    expect(await codigoDoErro(inserir({ grupoId: base.grupo.id, confirmadaPor: base.contaId }))).toBe('23505');
    expect(await codigoDoErro(inserir({ grupoId: base.outroGrupo.id, confirmadaPor: base.contaId }))).toBeNull();
  });

  it.each([
    ['n 1', { n: 1 }],
    ['n 12', { n: 12 }],
    ['k -1', { k: -1 }],
    ['k 21', { k: 21 }],
    ['k em varios_times', { formato: 'varios_times', k: 2 }],
    ['formato desconhecido', { formato: 'tres_times' }],
  ])('%s é recusado', async (_, parcial) => {
    const base = await comLimpeza();
    const erro = await codigoDoErro(inserir({ grupoId: base.grupo.id, confirmadaPor: base.contaId, ...parcial }));
    expect(erro).toBe('23514');
  });

  it.each(['[]', '1', '"x"'])('composição %s (não é objeto) é recusada', async (composicao) => {
    const base = await comLimpeza();
    expect(await codigoDoErro(inserir({ grupoId: base.grupo.id, confirmadaPor: base.contaId, composicao }))).toBe(
      '23514',
    );
  });

  it('composição nula é recusada', async () => {
    const base = await comLimpeza();
    expect(await codigoDoErro(inserir({ grupoId: base.grupo.id, confirmadaPor: base.contaId, composicao: null }))).toBe(
      '23502',
    );
  });

  it('grupo ou conta inexistentes violam a chave estrangeira', async () => {
    const base = await comLimpeza();
    expect(await codigoDoErro(inserir({ grupoId: SEM_ID, confirmadaPor: base.contaId }))).toBe('23503');
    expect(await codigoDoErro(inserir({ grupoId: base.grupo.id, confirmadaPor: SEM_ID }))).toBe('23503');
  });
});
