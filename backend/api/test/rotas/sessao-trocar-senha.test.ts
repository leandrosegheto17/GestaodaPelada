import { describe, expect, it, vi } from 'vitest';
import * as contas from '../../src/infraestrutura/db/repositorios/contas.js';
import { kyselyDe } from '../../src/infraestrutura/db/cliente.js';
import { clienteTeste } from '../apoio/cliente.js';
import { usarDbDoWorker } from '../apoio/db-worker.js';
import { criarConta } from '../apoio/fabricas/contas.js';
import { usarFabrica } from '../apoio/fabrica.js';
import { relogioFixo } from '../apoio/relogio.js';
import { entrarComo } from '../apoio/sessao.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);
const t0 = new Date(relogioFixo('2026-10-16').agoraIso());
const cliente = (cookie: string) => clienteTeste({ relogio: relogioFixo('2026-10-16'), cookie });
const NOVA = 'nova-senha-segura-1';

async function auditorias(db: Awaited<ReturnType<typeof abrir>>, contaId: string) {
  return kyselyDe(db).selectFrom('auditoria').select('acao').where('entidade_id', '=', contaId).execute();
}

describe('POST /api/sessao/trocar-senha (workerd)', () => {
  it('escopo troca_de_senha: promove a sessão, encerra as outras e a temporária deixa de valer', async () => {
    const db = await abrir();
    const conta = await criarConta(db, fabrica, { temporaria: true });
    fabrica.registrar(async () => {
      await kyselyDe(db).deleteFrom('auditoria').where('entidade_id', '=', conta.id).execute();
    });
    const atual = await entrarComo(db, fabrica, conta.id, { escopo: 'troca_de_senha', agora: t0 });
    const outra = await entrarComo(db, fabrica, conta.id, { escopo: 'troca_de_senha', agora: t0 });

    const r = await cliente(atual.cookie).post('/api/sessao/trocar-senha', { novaSenha: NOVA, confirmacao: NOVA });
    expect(r.status).toBe(204);
    expect((await cliente(atual.cookie).get('/api/sessao/eu')).corpo).toMatchObject({ escopo: 'completo' });
    expect((await cliente(outra.cookie).get('/api/sessao/eu')).status).toBe(401);
    expect(await contas.verificarSenha(db, conta.email, conta.senha)).toBeNull();
    expect((await contas.verificarSenha(db, conta.email, NOVA))?.senhaTemporaria).toBe(false);
    expect((await auditorias(db, conta.id)).map((a) => a.acao)).toEqual(['senha_trocada']);
  });

  it('nova igual à temporária é recusada em novaSenha', async () => {
    const db = await abrir();
    const conta = await criarConta(db, fabrica, { temporaria: true });
    const { cookie } = await entrarComo(db, fabrica, conta.id, { escopo: 'troca_de_senha', agora: t0 });
    const r = await cliente(cookie).post('/api/sessao/trocar-senha', {
      novaSenha: conta.senha,
      confirmacao: conta.senha,
    });
    expect(r.status).toBe(422);
    expect(r.corpo).toMatchObject({
      erro: { codigo: 'validacao', campos: { novaSenha: 'A nova senha precisa ser diferente da temporária.' } },
    });
  });

  it('escopo completo: exige a senha atual', async () => {
    const db = await abrir();
    const conta = await criarConta(db, fabrica);
    fabrica.registrar(async () => {
      await kyselyDe(db).deleteFrom('auditoria').where('entidade_id', '=', conta.id).execute();
    });
    const atual = await entrarComo(db, fabrica, conta.id, { agora: t0 });
    const outra = await entrarComo(db, fabrica, conta.id, { agora: t0 });

    for (const corpo of [
      { novaSenha: NOVA, confirmacao: NOVA },
      { senhaAtual: 'errada-errada', novaSenha: NOVA, confirmacao: NOVA },
    ]) {
      const recusada = await cliente(atual.cookie).post('/api/sessao/trocar-senha', corpo);
      expect(recusada.status).toBe(422);
      expect(recusada.corpo).toMatchObject({ erro: { campos: { senhaAtual: 'Senha atual incorreta.' } } });
    }
    const ok = await cliente(atual.cookie).post('/api/sessao/trocar-senha', {
      senhaAtual: conta.senha,
      novaSenha: NOVA,
      confirmacao: NOVA,
    });
    expect(ok.status).toBe(204);
    expect((await cliente(atual.cookie).get('/api/sessao/eu')).status).toBe(200);
    expect((await cliente(outra.cookie).get('/api/sessao/eu')).status).toBe(401);
  });

  it.each([
    ['7 caracteres', { novaSenha: '1234567', confirmacao: '1234567' }],
    ['73 caracteres', { novaSenha: 'a'.repeat(73), confirmacao: 'a'.repeat(73) }],
    ['72 caracteres com acento', { novaSenha: 'ç'.repeat(72), confirmacao: 'ç'.repeat(72) }],
    ['confirmação diferente', { novaSenha: NOVA, confirmacao: `${NOVA}x` }],
  ])('validação: %s → 422', async (_nome, corpo) => {
    const db = await abrir();
    const conta = await criarConta(db, fabrica, { temporaria: true });
    const { cookie } = await entrarComo(db, fabrica, conta.id, { escopo: 'troca_de_senha', agora: t0 });
    const r = await cliente(cookie).post('/api/sessao/trocar-senha', corpo);
    expect(r.status).toBe(422);
  });

  it('sem sessão: 401; nenhum log contém a senha', async () => {
    const db = await abrir();
    const conta = await criarConta(db, fabrica, { temporaria: true });
    fabrica.registrar(async () => {
      await kyselyDe(db).deleteFrom('auditoria').where('entidade_id', '=', conta.id).execute();
    });
    expect(
      (await clienteTeste({ relogio: relogioFixo('2026-10-16') }).post('/api/sessao/trocar-senha', {})).status,
    ).toBe(401);
    const espioes = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) =>
      vi.spyOn(console, m).mockImplementation(() => undefined),
    );
    const { cookie } = await entrarComo(db, fabrica, conta.id, { escopo: 'troca_de_senha', agora: t0 });
    await cliente(cookie).post('/api/sessao/trocar-senha', {
      novaSenha: 'senha-que-nao-pode-vazar',
      confirmacao: 'senha-que-nao-pode-vazar',
    });
    expect(JSON.stringify(espioes.flatMap((e) => e.mock.calls))).not.toContain('nao-pode-vazar');
    espioes.forEach((e) => e.mockRestore());
  });
});
