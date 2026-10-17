import { describe, expect, it } from 'vitest';
import { usarDb } from '../apoio/db-teste.js';
import { usarFabrica } from '../apoio/fabrica.js';
import { criarBase } from '../apoio/sql-dados.js';
import { codigoDoErro, executarSql } from '../apoio/sql.js';

const fabrica = usarFabrica();
const abrir = usarDb(fabrica);
const AGORA = '2026-10-16T12:00:00Z';
const DISPOSITIVO = '123e4567-e89b-12d3-a456-426614174000';

describe('migração de eventos de uso', () => {
  async function inserir(
    tipo: string,
    campos: { dispositivo?: string | null; mes?: string | null; data?: string | null },
  ): Promise<string | null> {
    const base = await criarBase(await abrir(), fabrica);
    fabrica.registrar(async () => {
      await executarSql('DELETE FROM eventos_uso WHERE grupo_id = $1', [base.grupo.id]);
    });
    return codigoDoErro(
      executarSql(
        'INSERT INTO eventos_uso (grupo_id, tipo, momento, dispositivo_id, mes_exportado, data_partida) VALUES ($1, $2, $3, $4, $5, $6)',
        [base.grupo.id, tipo, AGORA, campos.dispositivo ?? null, campos.mes ?? null, campos.data ?? null],
      ),
    );
  }

  it.each([
    ['ranking_aberto', { dispositivo: DISPOSITIVO }],
    ['pdf_exportado', { mes: '2026-10' }],
    ['partida_lancada', { data: '2026-10-15' }],
    ['escalacao_confirmada', { data: '2026-10-22' }],
  ])('%s com o campo certo é aceito', async (tipo, campos) => {
    expect(await inserir(tipo, campos)).toBeNull();
  });

  it.each([
    ['tipo desconhecido', 'pagina_vista', {}],
    ['ranking sem dispositivo', 'ranking_aberto', {}],
    ['ranking com mês', 'ranking_aberto', { dispositivo: DISPOSITIVO, mes: '2026-10' }],
    ['pdf sem mês', 'pdf_exportado', {}],
    ['pdf com mês inválido', 'pdf_exportado', { mes: '2026-13' }],
    ['partida sem data', 'partida_lancada', {}],
    ['dispositivo em partida', 'partida_lancada', { data: '2026-10-15', dispositivo: DISPOSITIVO }],
  ])('%s é recusado (23514)', async (_nome, tipo, campos) => {
    expect(await inserir(tipo, campos)).toBe('23514');
  });

  it('a tabela não guarda dado pessoal', async () => {
    const colunas = await executarSql<{ column_name: string }>(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'eventos_uso'",
    );
    const nomes = colunas.map((c) => c.column_name);
    expect([...nomes].sort()).toEqual(
      ['data_partida', 'dispositivo_id', 'grupo_id', 'id', 'mes_exportado', 'momento', 'tipo'].sort(),
    );
  });

  it('mês em formato curto e dispositivo não uuid são recusados', async () => {
    expect(await inserir('pdf_exportado', { mes: '26-10' })).toBe('23514');
    expect(await inserir('ranking_aberto', { dispositivo: 'nao-e-uuid' })).toBe('22P02');
  });
});
