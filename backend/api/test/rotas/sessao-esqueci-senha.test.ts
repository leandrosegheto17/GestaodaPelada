import { esqueciSenhaResposta } from '@pelada/contrato';
import { describe, expect, it } from 'vitest';
import { kyselyDe } from '../../src/infraestrutura/db/cliente.js';
import * as pedidos from '../../src/infraestrutura/db/repositorios/pedidos-reset.js';
import { clienteTeste } from '../apoio/cliente.js';
import { usarDbDoWorker } from '../apoio/db-worker.js';
import { criarConta } from '../apoio/fabricas/contas.js';
import { usarFabrica } from '../apoio/fabrica.js';
import { relogioFixo } from '../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);
const clienteEm = (data: string, hora = '12:00', semCsrf = false) =>
  clienteTeste({ relogio: relogioFixo(data, hora), semCsrf });

describe('POST /api/sessao/esqueci-senha (workerd)', () => {
  it('admin: 200 com a mensagem e um pedido pendente; repetir só atualiza a data', async () => {
    const db = await abrir();
    const conta = await criarConta(db, fabrica);
    fabrica.registrar(async () => {
      await kyselyDe(db).deleteFrom('pedidos_reset').where('conta_id', '=', conta.id).execute();
    });
    const r = await clienteEm('2026-10-16', '10:00').post('/api/sessao/esqueci-senha', { email: conta.email });
    expect(r.status).toBe(200);
    expect(esqueciSenhaResposta.safeParse(r.corpo).success).toBe(true);
    await clienteEm('2026-10-16', '11:00').post('/api/sessao/esqueci-senha', { email: conta.email.toUpperCase() });
    const pendentes = (await pedidos.listarPendentes(db)).filter((p) => p.contaId === conta.id);
    expect(pendentes).toHaveLength(1);
    expect(pendentes[0]?.ultimoPedidoEm).toEqual(new Date('2026-10-16T14:00:00Z'));
  });

  it('e-mail inexistente e conta do dono: resposta igual e nada gravado', async () => {
    const db = await abrir();
    const admin = await criarConta(db, fabrica);
    const dono = await criarConta(db, fabrica);
    await kyselyDe(db)
      .updateTable('contas')
      .set({ email: 'leandrosegheto17@gmail.com', e_dono: true })
      .where('id', '=', dono.id)
      .execute();
    fabrica.registrar(async () => {
      await kyselyDe(db).deleteFrom('pedidos_reset').where('conta_id', 'in', [admin.id, dono.id]).execute();
    });
    const antes = (await pedidos.listarPendentes(db)).length;
    const a = await clienteEm('2026-10-16').post('/api/sessao/esqueci-senha', { email: admin.email });
    const inexistente = await clienteEm('2026-10-16').post('/api/sessao/esqueci-senha', {
      email: 'ninguem@teste.invalid',
    });
    const doDono = await clienteEm('2026-10-16').post('/api/sessao/esqueci-senha', {
      email: 'leandrosegheto17@gmail.com',
    });
    expect(inexistente.texto).toBe(a.texto);
    expect(doDono.texto).toBe(a.texto);
    expect(inexistente.status).toBe(a.status);
    expect([...inexistente.headers.keys()].sort()).toEqual([...a.headers.keys()].sort());
    expect((await pedidos.listarPendentes(db)).length).toBe(antes + 1);
  });

  it.each([
    [{ email: '' }],
    [{ email: 'sem-arroba' }],
    [{ email: `${'a'.repeat(250)}@b.com` }],
    [{ email: 'a@b.com', outro: 1 }],
  ])('corpo %j → 422', async (corpo) => {
    const r = await clienteEm('2026-10-16').post('/api/sessao/esqueci-senha', corpo);
    expect(r.status).toBe(422);
  });

  it('e-mail malformado indica campos.email; corpo não JSON indica campos.corpo', async () => {
    const malformado = await clienteEm('2026-10-16').post('/api/sessao/esqueci-senha', { email: 'sem-arroba' });
    expect(malformado.corpo).toMatchObject({ erro: { campos: { email: expect.any(String) } } });
    const semCorpo = await clienteEm('2026-10-16').post('/api/sessao/esqueci-senha');
    expect(semCorpo.status).toBe(422);
    expect(semCorpo.corpo).toMatchObject({ erro: { campos: { corpo: expect.any(String) } } });
  });

  it('corpo acima do limite: 413', async () => {
    const r = await clienteEm('2026-10-16').post('/api/sessao/esqueci-senha', { email: 'a'.repeat(200_000) });
    expect(r.status).toBe(413);
  });

  it('sem X-Pelada: 403; com no-store', async () => {
    expect(
      (await clienteEm('2026-10-16', '12:00', true).post('/api/sessao/esqueci-senha', { email: 'a@b.com' })).status,
    ).toBe(403);
    const ok = await clienteEm('2026-10-16').post('/api/sessao/esqueci-senha', { email: 'a@b.com' });
    expect(ok.headers.get('Cache-Control')).toBe('no-store');
  });
});
