import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { codigoDoErro, executarSql } from '../apoio/sql.js';

const AGORA = '2026-10-16T12:00:00Z';
let autor = '';

async function criarGrupo(slug: string, extras: Record<string, unknown> = {}): Promise<string> {
  const v = {
    nome: 'Pelada de Teste',
    dia_semana: 'quinta',
    frequencia: 'semanal',
    horario: '20:00',
    situacao_comercial: 'uso_proprio',
    trial_inicio: null,
    ...extras,
  };
  const linhas = await executarSql<{ id: string }>(
    `INSERT INTO grupos (nome, slug, dia_semana, frequencia, horario, situacao_comercial, trial_inicio, criado_por, criado_em)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
    [
      v.nome,
      slug,
      v.dia_semana,
      v.frequencia,
      v.horario,
      v.situacao_comercial,
      v.trial_inicio,
      autor,
      AGORA,
    ],
  );
  return linhas[0]?.id as string;
}

beforeEach(async () => {
  const linhas = await executarSql<{ id: string }>(
    `INSERT INTO contas (email, nome, senha_hash, criada_em)
     VALUES ('autor@teste-grupos.invalid', 'Autor', 'x', $1) RETURNING id`,
    [AGORA],
  );
  autor = linhas[0]?.id as string;
});

afterEach(async () => {
  await executarSql('DELETE FROM vinculos_admin');
  await executarSql("DELETE FROM grupos WHERE slug LIKE 'teste-%'");
  await executarSql("DELETE FROM contas WHERE email = 'autor@teste-grupos.invalid'");
});

describe('migração de grupos', () => {
  it('o slug não muda, mas o nome sim', async () => {
    const id = await criarGrupo('teste-slug');
    const atualizar = (sql: string) => executarSql(sql, [id]);
    expect(
      await codigoDoErro(atualizar("UPDATE grupos SET slug = 'teste-outro' WHERE id = $1")),
    ).toBe('P0001');
    expect(
      await codigoDoErro(atualizar("UPDATE grupos SET nome = 'Novo nome' WHERE id = $1")),
    ).toBeNull();
    expect(
      await codigoDoErro(atualizar("UPDATE grupos SET slug = 'teste-slug' WHERE id = $1")),
    ).toBeNull();
    const linhas = await executarSql<{ slug: string }>('SELECT slug FROM grupos WHERE id = $1', [
      id,
    ]);
    expect(linhas[0]?.slug).toBe('teste-slug');
  });

  it('slug duplicado e formatos inválidos são recusados', async () => {
    await criarGrupo('teste-dup');
    expect(await codigoDoErro(criarGrupo('teste-dup'))).toBe('23505');
    for (const ruim of ['Abc', 'a b', 'a'.repeat(65)]) {
      expect(await codigoDoErro(criarGrupo(ruim))).toBe('23514');
    }
  });

  it('vínculo duplicado é recusado e financeiro começa desligado', async () => {
    const grupo = await criarGrupo('teste-vinculo');
    const vincular = () =>
      executarSql(
        'INSERT INTO vinculos_admin (conta_id, grupo_id, criado_por, criado_em) VALUES ($1, $2, $1, $3)',
        [autor, grupo, AGORA],
      );
    await vincular();
    expect(await codigoDoErro(vincular())).toBe('23505');
    const linhas = await executarSql<{ acessa_financeiro: boolean }>(
      'SELECT acessa_financeiro FROM vinculos_admin WHERE grupo_id = $1',
      [grupo],
    );
    expect(linhas[0]?.acessa_financeiro).toBe(false);
  });

  it('situação comercial e trial andam juntos', async () => {
    expect(await codigoDoErro(criarGrupo('teste-t1', { situacao_comercial: 'trial' }))).toBe(
      '23514',
    );
    expect(
      await codigoDoErro(
        criarGrupo('teste-t2', { situacao_comercial: 'ativo', trial_inicio: '2026-10-01' }),
      ),
    ).toBe('23514');
    expect(
      await codigoDoErro(
        criarGrupo('teste-t3', { situacao_comercial: 'trial', trial_inicio: '2026-10-01' }),
      ),
    ).toBeNull();
    const padrao = await criarGrupo('teste-t4');
    const linhas = await executarSql<{ situacao_comercial: string }>(
      'SELECT situacao_comercial FROM grupos WHERE id = $1',
      [padrao],
    );
    expect(linhas[0]?.situacao_comercial).toBe('uso_proprio');
  });

  it('dia, frequência e tamanho do nome fora do limite são recusados', async () => {
    expect(await codigoDoErro(criarGrupo('teste-e1', { dia_semana: 'feriado' }))).toBe('23514');
    expect(await codigoDoErro(criarGrupo('teste-e2', { frequencia: 'diaria' }))).toBe('23514');
    expect(await codigoDoErro(criarGrupo('teste-e3', { nome: 'ab' }))).toBe('23514');
    expect(await codigoDoErro(criarGrupo('teste-e4', { nome: 'a'.repeat(61) }))).toBe('23514');
  });
});
