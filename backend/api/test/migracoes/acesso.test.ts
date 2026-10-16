import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { aplicarMigracoes } from '../../src/infraestrutura/db/migracoes/aplicar.js';
import { lerMigracoes } from '../../src/infraestrutura/db/migracoes/ler.js';
import { codigoDoErro, executarSql } from '../apoio/sql.js';
import { URL_BANCO_TESTE } from '../apoio/url-teste.js';

const DONO = 'leandrosegheto17@gmail.com';
const AGORA = '2026-10-16T12:00:00Z';

async function criarConta(email: string, dono = false): Promise<string> {
  const linhas = await executarSql<{ id: string }>(
    `INSERT INTO contas (email, nome, senha_hash, criada_em, e_dono)
     VALUES ($1, 'Teste', 'x', $2, $3) RETURNING id`,
    [email, AGORA, dono],
  );
  return linhas[0]?.id as string;
}

afterEach(async () => {
  await executarSql('DELETE FROM auditoria');
  await executarSql('DELETE FROM pedidos_reset');
  await executarSql('DELETE FROM sessoes');
  await executarSql('DELETE FROM tentativas_login');
  await executarSql("DELETE FROM contas WHERE email LIKE '%@teste-acesso.invalid' OR e_dono");
});

describe('migração de acesso', () => {
  it('aceita o dono com o e-mail do RF-01 e recusa um segundo dono', async () => {
    await criarConta(DONO, true);
    expect(await codigoDoErro(criarConta('outro@teste-acesso.invalid', true))).toBe('23514');
    const indices = await executarSql<{ indexdef: string }>(
      "SELECT indexdef FROM pg_indexes WHERE indexname = 'contas_um_dono'",
    );
    expect(indices[0]?.indexdef).toMatch(/WHERE/);
  });

  it('aceita conta comum com qualquer e-mail normalizado', async () => {
    expect(await codigoDoErro(criarConta('qualquer@teste-acesso.invalid'))).toBeNull();
  });

  it('recusa e-mail com maiúscula ou espaço e e-mail repetido', async () => {
    expect(await codigoDoErro(criarConta('Maiuscula@teste-acesso.invalid'))).toBe('23514');
    expect(await codigoDoErro(criarConta(' espaco@teste-acesso.invalid'))).toBe('23514');
    await criarConta('repetido@teste-acesso.invalid');
    expect(await codigoDoErro(criarConta('repetido@teste-acesso.invalid'))).toBe('23505');
  });

  it('só um pedido pendente por conta; depois de resolver, outro é aceito', async () => {
    const conta = await criarConta('pedido@teste-acesso.invalid');
    const inserir = () =>
      executarSql('INSERT INTO pedidos_reset (conta_id, ultimo_pedido_em) VALUES ($1, $2)', [
        conta,
        AGORA,
      ]);
    await inserir();
    expect(await codigoDoErro(inserir())).toBe('23505');
    await executarSql('UPDATE pedidos_reset SET resolvido_em = $2 WHERE conta_id = $1', [
      conta,
      AGORA,
    ]);
    expect(await codigoDoErro(inserir())).toBeNull();
  });

  it('sessão com escopo inválido ou hash de 31 bytes é recusada', async () => {
    const conta = await criarConta('sessao@teste-acesso.invalid');
    const inserir = (bytes: number, escopo: string) =>
      executarSql(
        `INSERT INTO sessoes (token_hash, conta_id, escopo, criada_em, ultimo_uso_em, expira_em)
         VALUES (decode(repeat('ab', $1::int), 'hex'), $2, $3, $4, $4, $4)`,
        [bytes, conta, escopo, AGORA],
      );
    expect(await codigoDoErro(inserir(32, 'outro'))).toBe('23514');
    expect(await codigoDoErro(inserir(31, 'completo'))).toBe('23514');
    expect(await codigoDoErro(inserir(32, 'completo'))).toBeNull();
  });

  it('auditoria de infraestrutura não pode ter autor de conta', async () => {
    const conta = await criarConta('auditor@teste-acesso.invalid');
    const inserir = (tipo: string, autor: string | null) =>
      executarSql(
        `INSERT INTO auditoria (autor_tipo, autor_conta_id, acao, entidade, momento)
         VALUES ($1, $2, 'x', 'y', $3)`,
        [tipo, autor, AGORA],
      );
    expect(await codigoDoErro(inserir('infraestrutura', conta))).toBe('23514');
    expect(await codigoDoErro(inserir('conta', null))).toBe('23514');
    expect(await codigoDoErro(inserir('infraestrutura', null))).toBeNull();
  });

  it('reaplicar as migrações não aplica nada', async () => {
    const pasta = join(import.meta.dirname, '../../src/infraestrutura/db/migracoes');
    const r = await aplicarMigracoes(URL_BANCO_TESTE, lerMigracoes(pasta));
    expect(r.aplicadas).toEqual([]);
  });
});
