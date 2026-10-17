import { randomBytes, randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { ContaNaoEncontrada, redefinirSenha } from '../../../src/aplicacao/acesso/senhas.js';
import * as contas from '../../../src/infraestrutura/db/repositorios/contas.js';
import * as pedidos from '../../../src/infraestrutura/db/repositorios/pedidos-reset.js';
import * as sessoes from '../../../src/infraestrutura/db/repositorios/sessoes.js';
import { ALFABETO_SENHA_TEMPORARIA } from '../../../src/infraestrutura/seguranca/senha-temporaria.js';
import { usarDb } from '../../apoio/db-teste.js';
import { criarConta } from '../../apoio/fabricas/contas.js';
import { criarPedido } from '../../apoio/fabricas/pedidos-reset.js';
import { usarFabrica } from '../../apoio/fabrica.js';
import { relogioFixo } from '../../apoio/relogio.js';
import { executarSql } from '../../apoio/sql.js';

const fabrica = usarFabrica();
const abrir = usarDb(fabrica);
const agora = new Date(relogioFixo('2026-10-16').agoraIso());

describe('redefinirSenha', () => {
  it('troca a senha, encerra as sessões, resolve o pedido e audita', async () => {
    const db = await abrir();
    const conta = await criarConta(db, fabrica);
    const autor = await criarConta(db, fabrica);
    const hashes = [randomBytes(32), randomBytes(32)].map((b) => new Uint8Array(b));
    for (const tokenHash of hashes) {
      await sessoes.criar(db, { contaId: conta.id, tokenHash, escopo: 'completo', agora });
    }
    await criarPedido(db, fabrica, conta.id, agora);
    fabrica.registrar(async () => {
      await executarSql("DELETE FROM auditoria WHERE entidade = 'conta' AND entidade_id = $1", [conta.id]);
    });

    const resultado = await redefinirSenha(db, conta.id, { tipo: 'conta', contaId: autor.id }, agora);

    expect(resultado.senhaTemporaria).toHaveLength(12);
    for (const c of resultado.senhaTemporaria) expect(ALFABETO_SENHA_TEMPORARIA).toContain(c);
    for (const hash of hashes) expect(await sessoes.buscarValidaEDeslizar(db, hash, agora)).toBeNull();
    expect((await pedidos.listarPendentes(db)).some((p) => p.contaId === conta.id)).toBe(false);
    expect(await contas.verificarSenha(db, conta.email, resultado.senhaTemporaria)).toEqual({
      contaId: conta.id,
      senhaTemporaria: true,
    });
    expect(await contas.verificarSenha(db, conta.email, conta.senha)).toBeNull();
    const linhas = await executarSql<{ autor_conta_id: string; resumo: object }>(
      "SELECT autor_conta_id, resumo FROM auditoria WHERE entidade = 'conta' AND entidade_id = $1",
      [conta.id],
    );
    expect(linhas).toHaveLength(1);
    expect(linhas[0]?.autor_conta_id).toBe(autor.id);
    expect(JSON.stringify(linhas[0]?.resumo)).not.toContain(resultado.senhaTemporaria);
  });

  it('autor de infraestrutura e conta sem pedido pendente', async () => {
    const db = await abrir();
    const conta = await criarConta(db, fabrica);
    fabrica.registrar(async () => {
      await executarSql("DELETE FROM auditoria WHERE entidade = 'conta' AND entidade_id = $1", [conta.id]);
    });
    await redefinirSenha(db, conta.id, { tipo: 'infraestrutura' }, agora);
    const linhas = await executarSql<{ autor_tipo: string; autor_conta_id: string | null }>(
      'SELECT autor_tipo, autor_conta_id FROM auditoria WHERE entidade_id = $1',
      [conta.id],
    );
    expect(linhas).toEqual([{ autor_tipo: 'infraestrutura', autor_conta_id: null }]);
  });

  it('conta inexistente: erro de domínio e nada gravado', async () => {
    const db = await abrir();
    const inexistente = randomUUID();
    await expect(redefinirSenha(db, inexistente, { tipo: 'infraestrutura' }, agora)).rejects.toBeInstanceOf(
      ContaNaoEncontrada,
    );
    expect(await executarSql('SELECT 1 FROM auditoria WHERE entidade_id = $1', [inexistente])).toEqual([]);
  });

  it('falha na auditoria desfaz tudo: senha, sessões e pedido continuam', async () => {
    const db = await abrir();
    const conta = await criarConta(db, fabrica);
    const tokenHash = new Uint8Array(randomBytes(32));
    await sessoes.criar(db, { contaId: conta.id, tokenHash, escopo: 'completo', agora });
    await criarPedido(db, fabrica, conta.id, agora);

    // Autor inexistente viola a chave estrangeira da auditoria, depois de todo o resto.
    await expect(redefinirSenha(db, conta.id, { tipo: 'conta', contaId: randomUUID() }, agora)).rejects.toThrow();

    expect(await contas.verificarSenha(db, conta.email, conta.senha)).toEqual({
      contaId: conta.id,
      senhaTemporaria: false,
    });
    expect(await sessoes.buscarValidaEDeslizar(db, tokenHash, agora)).not.toBeNull();
    expect((await pedidos.listarPendentes(db)).some((p) => p.contaId === conta.id)).toBe(true);
  });

  it('duas chamadas geram senhas diferentes e só a última vale; nada vai para o log', async () => {
    const db = await abrir();
    const conta = await criarConta(db, fabrica);
    fabrica.registrar(async () => {
      await executarSql("DELETE FROM auditoria WHERE entidade = 'conta' AND entidade_id = $1", [conta.id]);
    });
    const espioes = (['log', 'info', 'warn', 'error'] as const).map((m) =>
      vi.spyOn(console, m).mockImplementation(() => undefined),
    );
    try {
      const a = await redefinirSenha(db, conta.id, { tipo: 'infraestrutura' }, agora);
      const b = await redefinirSenha(db, conta.id, { tipo: 'infraestrutura' }, agora);
      expect(a.senhaTemporaria).not.toBe(b.senhaTemporaria);
      expect(await contas.verificarSenha(db, conta.email, a.senhaTemporaria)).toBeNull();
      expect(await contas.verificarSenha(db, conta.email, b.senhaTemporaria)).not.toBeNull();
      const saida = JSON.stringify(espioes.flatMap((e) => e.mock.calls));
      expect(saida).not.toContain(a.senhaTemporaria);
      expect(saida).not.toContain(b.senhaTemporaria);
    } finally {
      for (const e of espioes) e.mockRestore();
    }
  });
});
