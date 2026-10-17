import { describe, expect, it, vi } from 'vitest';
import { sql } from 'kysely';
import { kyselyDe } from '../../src/infraestrutura/db/cliente.js';
import { emTransacao } from '../../src/infraestrutura/db/transacao.js';
import * as contas from '../../src/infraestrutura/db/repositorios/contas.js';
import { criarConta, SENHA_PADRAO } from '../apoio/fabricas/contas.js';
import { usarFabrica } from '../apoio/fabrica.js';
import { usarDb } from '../apoio/db-teste.js';
import { executarSql } from '../apoio/sql.js';
import { relogioFixo } from '../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDb(fabrica);
const relogio = relogioFixo('2026-10-16');
const agora = () => new Date(relogio.agoraIso());

describe('repositório de contas', () => {
  it('verifica senha certa, errada e e-mail inexistente', async () => {
    const db = await abrir();
    const conta = await criarConta(db, fabrica);
    expect(await contas.verificarSenha(db, conta.email, conta.senha)).toEqual({
      contaId: conta.id,
      senhaTemporaria: false,
    });
    expect(await contas.verificarSenha(db, conta.email, 'outra-senha')).toBeNull();
    expect(await contas.verificarSenha(db, 'nao-existe@teste.invalid', conta.senha)).toBeNull();
  });

  it('o bcrypt considera só os 72 primeiros bytes (o limite é do contrato)', async () => {
    const db = await abrir();
    const base = 'a'.repeat(72);
    const conta = await criarConta(db, fabrica, { senha: base });
    expect(await contas.verificarSenha(db, conta.email, `${base}b`)).not.toBeNull();
  });

  it('e-mail existente e inexistente executam exatamente um crypt cada', async () => {
    const db = await abrir();
    const conta = await criarConta(db, fabrica);
    const chamadasDeCrypt = (email: string) =>
      emTransacao(db, async (tx) => {
        const k = kyselyDe(tx);
        await sql`SET LOCAL track_functions = 'all'`.execute(k);
        const total = async () => {
          const r = await sql<{ chamadas: string }>`
            SELECT coalesce(sum(calls), 0)::text AS chamadas
            FROM pg_stat_xact_user_functions WHERE funcname = 'crypt'`.execute(k);
          return Number(r.rows[0]?.chamadas);
        };
        const antes = await total();
        await contas.verificarSenha(tx, email, 'qualquer');
        return (await total()) - antes;
      });
    expect(await chamadasDeCrypt(conta.email)).toBe(1);
    expect(await chamadasDeCrypt('nao-existe@teste.invalid')).toBe(1);

    const [linha] = await executarSql<{ senha_hash: string }>('SELECT senha_hash FROM contas WHERE id = $1', [
      conta.id,
    ]);
    const custoDe = (hash: string | undefined) => /^\$2[aby]\$(\d{2})\$/.exec(hash ?? '')?.[1];
    expect(custoDe(contas.HASH_FIXO)).toBe('12');
    expect(custoDe(contas.HASH_FIXO)).toBe(custoDe(linha?.senha_hash));
  });

  it('cria com hash bcrypt de custo 12 e nunca expõe o hash', async () => {
    const db = await abrir();
    const conta = await criarConta(db, fabrica);
    const [linha] = await executarSql<{ senha_hash: string }>('SELECT senha_hash FROM contas WHERE id = $1', [
      conta.id,
    ]);
    expect(linha?.senha_hash.startsWith('$2a$12$')).toBe(true);
    const buscada = await contas.buscarPorEmail(db, conta.email);
    expect(Object.keys(buscada ?? {}).sort()).toEqual(
      ['avisoPrivacidadeVistoEm', 'eDono', 'email', 'id', 'nome', 'senhaTemporaria'].sort(),
    );
    expect(buscada?.eDono).toBe(false);
    expect(await contas.buscarPorId(db, conta.id)).toEqual(buscada);
  });

  it('trocarSenha marca e desmarca a temporária e invalida a senha antiga', async () => {
    const db = await abrir();
    const conta = await criarConta(db, fabrica, { temporaria: true });
    expect((await contas.verificarSenha(db, conta.email, conta.senha))?.senhaTemporaria).toBe(true);
    await contas.trocarSenha(db, conta.id, 'nova-senha-456', { temporaria: false });
    expect(await contas.verificarSenha(db, conta.email, conta.senha)).toBeNull();
    expect((await contas.verificarSenha(db, conta.email, 'nova-senha-456'))?.senhaTemporaria).toBe(false);
  });

  it('marcarAvisoVisto mantém o primeiro momento', async () => {
    const db = await abrir();
    const conta = await criarConta(db, fabrica);
    const primeiro = agora();
    await contas.marcarAvisoVisto(db, conta.id, primeiro);
    await contas.marcarAvisoVisto(db, conta.id, new Date(primeiro.getTime() + 86_400_000));
    expect((await contas.buscarPorId(db, conta.id))?.avisoPrivacidadeVistoEm).toEqual(primeiro);
  });

  it('nenhuma saída de log contém a senha, nem no erro de e-mail duplicado', async () => {
    const db = await abrir();
    const espioes = (['log', 'info', 'warn', 'error', 'debug'] as const).map((metodo) =>
      vi.spyOn(console, metodo).mockImplementation(() => undefined),
    );
    const conta = await criarConta(db, fabrica, { senha: 'senha-que-nao-pode-vazar' });
    await contas.verificarSenha(db, conta.email, 'senha-que-nao-pode-vazar');
    await contas.trocarSenha(db, conta.id, 'outra-senha-que-nao-pode-vazar', { temporaria: false });
    await expect(
      contas.criar(db, {
        email: conta.email,
        nome: 'Duplicada',
        senha: 'senha-que-nao-pode-vazar',
        senhaTemporaria: false,
        agora: agora(),
      }),
    ).rejects.toThrow();
    const saida = JSON.stringify(espioes.flatMap((e) => e.mock.calls));
    expect(saida).not.toContain('nao-pode-vazar');
    espioes.forEach((e) => e.mockRestore());
  });

  it('usa a senha padrão da fábrica', () => {
    expect(SENHA_PADRAO.length).toBeGreaterThanOrEqual(8);
  });
});
