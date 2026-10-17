import { randomBytes } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { trocarSenha } from '../../../src/aplicacao/acesso/trocar-senha.js';
import * as contas from '../../../src/infraestrutura/db/repositorios/contas.js';
import * as pedidos from '../../../src/infraestrutura/db/repositorios/pedidos-reset.js';
import * as sessoes from '../../../src/infraestrutura/db/repositorios/sessoes.js';
import { usarDb } from '../../apoio/db-teste.js';
import { criarConta } from '../../apoio/fabricas/contas.js';
import { criarPedido } from '../../apoio/fabricas/pedidos-reset.js';
import { usarFabrica } from '../../apoio/fabrica.js';
import { relogioFixo } from '../../apoio/relogio.js';
import { executarSql } from '../../apoio/sql.js';

const fabrica = usarFabrica();
const abrir = usarDb(fabrica);
const agora = new Date(relogioFixo('2026-10-16').agoraIso());
const NOVA = 'nova-senha-segura-1';

async function cenario(temporaria: boolean) {
  const db = await abrir();
  const conta = await criarConta(db, fabrica, { temporaria });
  fabrica.registrar(async () => {
    await executarSql("DELETE FROM auditoria WHERE entidade = 'conta' AND entidade_id = $1", [conta.id]);
  });
  const escopo = temporaria ? ('troca_de_senha' as const) : ('completo' as const);
  const nova = async () => {
    const tokenHash = new Uint8Array(randomBytes(32));
    const { id } = await sessoes.criar(db, { contaId: conta.id, tokenHash, escopo, agora });
    return { id, tokenHash };
  };
  return { db, conta, escopo, nova };
}

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

describe('trocarSenha', () => {
  it('escopo restrito: troca, promove, encerra as outras, resolve o pedido e audita', async () => {
    const { db, conta, escopo, nova } = await cenario(true);
    const atual = await nova();
    const outra = await nova();
    await criarPedido(db, fabrica, conta.id, agora);

    const r = await trocarSenha(
      db,
      { contaId: conta.id, sessaoId: atual.id, escopo },
      { novaSenha: NOVA, senhaAtual: 'ignorada' },
      agora,
    );

    expect(r).toEqual({ tipo: 'ok' });
    expect((await sessoes.buscarValidaEDeslizar(db, atual.tokenHash, agora))?.escopo).toBe('completo');
    expect(await sessoes.buscarValidaEDeslizar(db, outra.tokenHash, agora)).toBeNull();
    expect(await contas.verificarSenha(db, conta.email, conta.senha)).toBeNull();
    expect((await contas.verificarSenha(db, conta.email, NOVA))?.senhaTemporaria).toBe(false);
    expect((await pedidos.listarPendentes(db)).some((p) => p.contaId === conta.id)).toBe(false);
    const linhas = await executarSql<{ acao: string; autor_conta_id: string }>(
      'SELECT acao, autor_conta_id FROM auditoria WHERE entidade_id = $1',
      [conta.id],
    );
    expect(linhas).toEqual([{ acao: 'senha_trocada', autor_conta_id: conta.id }]);
  });

  it('escopo restrito: nova igual à temporária é recusada e nada muda', async () => {
    const { db, conta, escopo, nova } = await cenario(true);
    const atual = await nova();
    const r = await trocarSenha(
      db,
      { contaId: conta.id, sessaoId: atual.id, escopo },
      { novaSenha: conta.senha },
      agora,
    );
    expect(r).toEqual({
      tipo: 'recusada',
      campos: { novaSenha: 'A nova senha precisa ser diferente da temporária.' },
    });
    expect((await contas.verificarSenha(db, conta.email, conta.senha))?.senhaTemporaria).toBe(true);
    expect((await sessoes.buscarValidaEDeslizar(db, atual.tokenHash, agora))?.escopo).toBe('troca_de_senha');
  });

  it('escopo completo: sem a senha atual ou com ela errada é recusado; certa troca', async () => {
    const { db, conta, escopo, nova } = await cenario(false);
    const atual = await nova();
    const sessao = { contaId: conta.id, sessaoId: atual.id, escopo };
    for (const senhaAtual of [undefined, 'errada-errada']) {
      expect(await trocarSenha(db, sessao, { senhaAtual, novaSenha: NOVA }, agora)).toEqual({
        tipo: 'recusada',
        campos: { senhaAtual: 'Senha atual incorreta.' },
      });
    }
    expect(await contas.verificarSenha(db, conta.email, conta.senha)).not.toBeNull();
    expect(await trocarSenha(db, sessao, { senhaAtual: conta.senha, novaSenha: NOVA }, agora)).toEqual({ tipo: 'ok' });
    expect(await contas.verificarSenha(db, conta.email, NOVA)).not.toBeNull();
  });

  it('falha na auditoria desfaz tudo: senha, escopo, outras sessões e pedido continuam', async () => {
    const { db, conta, escopo, nova } = await cenario(true);
    const atual = await nova();
    const outra = await nova();
    await criarPedido(db, fabrica, conta.id, agora);
    falha.auditoria = true;
    try {
      await expect(
        trocarSenha(db, { contaId: conta.id, sessaoId: atual.id, escopo }, { novaSenha: NOVA }, agora),
      ).rejects.toThrow('auditoria indisponível');
    } finally {
      falha.auditoria = false;
    }
    expect((await contas.verificarSenha(db, conta.email, conta.senha))?.senhaTemporaria).toBe(true);
    expect(await contas.verificarSenha(db, conta.email, NOVA)).toBeNull();
    expect((await sessoes.buscarValidaEDeslizar(db, atual.tokenHash, agora))?.escopo).toBe('troca_de_senha');
    expect(await sessoes.buscarValidaEDeslizar(db, outra.tokenHash, agora)).not.toBeNull();
    expect((await pedidos.listarPendentes(db)).some((p) => p.contaId === conta.id)).toBe(true);
  });

  it('nenhuma senha vai para o log', async () => {
    const { db, conta, escopo, nova } = await cenario(false);
    const atual = await nova();
    const espioes = (['log', 'info', 'warn', 'error'] as const).map((m) =>
      vi.spyOn(console, m).mockImplementation(() => undefined),
    );
    try {
      const sessao = { contaId: conta.id, sessaoId: atual.id, escopo };
      await trocarSenha(db, sessao, { senhaAtual: 'errada-vazou-1', novaSenha: 'nova-vazou-2' }, agora);
      await trocarSenha(db, sessao, { senhaAtual: conta.senha, novaSenha: 'nova-vazou-2' }, agora);
      const saida = JSON.stringify(espioes.flatMap((e) => e.mock.calls));
      expect(saida).not.toContain('vazou');
      expect(saida).not.toContain(conta.senha);
    } finally {
      for (const e of espioes) e.mockRestore();
    }
  });
});
