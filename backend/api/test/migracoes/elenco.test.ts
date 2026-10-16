import { describe, expect, it } from 'vitest';
import { usarDb } from '../apoio/db-teste.js';
import { usarFabrica } from '../apoio/fabrica.js';
import { criarBase, inserirJogador } from '../apoio/sql-dados.js';
import { codigoDoErro, executarSql } from '../apoio/sql.js';

const fabrica = usarFabrica();
const abrir = usarDb(fabrica);

describe('migração do elenco', () => {
  it('apelido repetido no grupo (sem caixa) é recusado; em outro grupo é aceito', async () => {
    const base = await criarBase(await abrir(), fabrica);
    await inserirJogador(fabrica, base, base.grupo.id, 'Toninho');
    expect(await codigoDoErro(inserirJogador(fabrica, base, base.grupo.id, 'TONINHO'))).toBe('23505');
    expect(await codigoDoErro(inserirJogador(fabrica, base, base.outroGrupo.id, 'Toninho'))).toBeNull();
  });

  it.each([
    ['apelido de 1 caractere', { apelido: 'a' }],
    ['apelido de 31 caracteres', { apelido: 'a'.repeat(31) }],
    ['ano 1939', { ano: 1939 }],
    ['posição inválida', { posicao: 'lateral' }],
    ['telefone com 10 dígitos', { telefone: '1198765432' }],
    ['telefone com máscara', { telefone: '(11) 98765-4321' }],
  ])('%s é recusado (23514)', async (_nome, extras) => {
    const base = await criarBase(await abrir(), fabrica);
    const { apelido = 'Jogador', ...resto } = extras as { apelido?: string };
    expect(await codigoDoErro(inserirJogador(fabrica, base, base.grupo.id, apelido, resto))).toBe('23514');
  });

  it('ano e posição podem ser nulos (anonimização)', async () => {
    const base = await criarBase(await abrir(), fabrica);
    expect(
      await codigoDoErro(inserirJogador(fabrica, base, base.grupo.id, 'Anonimo', { ano: null, posicao: null })),
    ).toBeNull();
  });

  it('períodos: fim antes do início, dois abertos e período sem jogador do grupo são recusados', async () => {
    const base = await criarBase(await abrir(), fabrica);
    const jogador = await inserirJogador(fabrica, base, base.grupo.id, 'Periodos');
    const inserir = (grupoId: string, inicio: string, fim: string | null) =>
      executarSql('INSERT INTO periodos_ativos (jogador_id, grupo_id, inicio, fim) VALUES ($1, $2, $3, $4)', [
        jogador,
        grupoId,
        inicio,
        fim,
      ]);
    expect(await codigoDoErro(inserir(base.grupo.id, '2026-10-10', '2026-10-09'))).toBe('23514');
    expect(await codigoDoErro(inserir(base.grupo.id, '2026-10-10', '2026-10-10'))).toBeNull();
    expect(await codigoDoErro(inserir(base.grupo.id, '2026-10-11', null))).toBeNull();
    expect(await codigoDoErro(inserir(base.grupo.id, '2026-10-12', null))).toBe('23505');
    expect(await codigoDoErro(inserir(base.outroGrupo.id, '2026-09-01', '2026-09-02'))).toBe('23503');
  });

  it('apagar o jogador apaga os períodos', async () => {
    const base = await criarBase(await abrir(), fabrica);
    const jogador = await inserirJogador(fabrica, base, base.grupo.id, 'Cascata');
    await executarSql("INSERT INTO periodos_ativos (jogador_id, grupo_id, inicio) VALUES ($1, $2, '2026-10-01')", [
      jogador,
      base.grupo.id,
    ]);
    await executarSql('DELETE FROM jogadores WHERE id = $1', [jogador]);
    expect(await executarSql('SELECT 1 FROM periodos_ativos WHERE jogador_id = $1', [jogador])).toEqual([]);
  });
});
