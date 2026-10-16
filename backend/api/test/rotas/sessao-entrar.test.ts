import { erroBloqueado, erroNaoAutenticado } from '@pelada/contrato';
import { describe, expect, it, vi } from 'vitest';
import { kyselyDe } from '../../src/infraestrutura/db/cliente.js';
import { clienteTeste } from '../apoio/cliente.js';
import { usarDbDoWorker } from '../apoio/db-worker.js';
import { criarConta } from '../apoio/fabricas/contas.js';
import { usarFabrica } from '../apoio/fabrica.js';
import { relogioFixo } from '../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);
const clienteEm = (data: string, hora = '12:00', cookie?: string) =>
  clienteTeste({ relogio: relogioFixo(data, hora), ...(cookie ? { cookie } : {}) });

function cookieDaResposta(headers: Headers): string {
  return (headers.get('Set-Cookie') ?? '').split(';')[0] ?? '';
}

describe('POST /api/sessao/entrar (workerd)', () => {
  it('sucesso: 204, cookie com os atributos certos e sessão completa', async () => {
    const db = await abrir();
    const conta = await criarConta(db, fabrica);
    const r = await clienteEm('2026-10-16').post('/api/sessao/entrar', { email: conta.email, senha: conta.senha });
    expect(r.status).toBe(204);
    const cabecalho = r.headers.get('Set-Cookie') ?? '';
    expect(cabecalho).toMatch(/^__Host-sessao=/);
    expect(cabecalho).toMatch(/HttpOnly/);
    expect(cabecalho).toMatch(/Secure/);
    expect(cabecalho).toMatch(/SameSite=Lax/);
    expect(cabecalho).toMatch(/Path=\//);
    expect(cabecalho).not.toMatch(/Domain/i);
    const eu = await clienteEm('2026-10-16', '12:00', cookieDaResposta(r.headers)).get('/api/sessao/eu');
    expect(eu.corpo).toMatchObject({ escopo: 'completo' });
  });

  it('senha temporária abre sessão com escopo troca_de_senha', async () => {
    const db = await abrir();
    const conta = await criarConta(db, fabrica, { temporaria: true });
    const r = await clienteEm('2026-10-16').post('/api/sessao/entrar', { email: conta.email, senha: conta.senha });
    const eu = await clienteEm('2026-10-16', '12:00', cookieDaResposta(r.headers)).get('/api/sessao/eu');
    expect(eu.corpo).toMatchObject({ escopo: 'troca_de_senha', grupos: [] });
  });

  it('senha errada e e-mail inexistente dão o mesmo 401 genérico', async () => {
    const db = await abrir();
    const conta = await criarConta(db, fabrica);
    const errada = await clienteEm('2026-10-16').post('/api/sessao/entrar', {
      email: conta.email,
      senha: 'errada-123',
    });
    const inexistente = await clienteEm('2026-10-16').post('/api/sessao/entrar', {
      email: 'ninguem@teste.invalid',
      senha: 'errada-123',
    });
    expect(errada.status).toBe(401);
    expect(inexistente.status).toBe(401);
    expect(errada.texto).toBe(inexistente.texto);
    expect(erroNaoAutenticado.safeParse(errada.corpo).success).toBe(true);
    expect(errada.headers.get('Set-Cookie')).toBeNull();
  });

  it('5 falhas bloqueiam o e-mail (inclusive com a senha certa) por 15 minutos', async () => {
    const db = await abrir();
    const conta = await criarConta(db, fabrica);
    for (let i = 0; i < 5; i++) {
      const minuto = String(i).padStart(2, '0');
      await clienteEm('2026-10-16', `12:${minuto}`).post('/api/sessao/entrar', {
        email: conta.email,
        senha: 'errada-123',
      });
    }
    const bloqueado = await clienteEm('2026-10-16', '12:05').post('/api/sessao/entrar', {
      email: conta.email,
      senha: conta.senha,
    });
    expect(bloqueado.status).toBe(429);
    expect(erroBloqueado.safeParse(bloqueado.corpo).success).toBe(true);
    expect((bloqueado.corpo as { erro: { liberaEm: string } }).erro.liberaEm).toBe('2026-10-16T15:19:00.000Z');
    const depois = await clienteEm('2026-10-16', '12:20').post('/api/sessao/entrar', {
      email: conta.email,
      senha: conta.senha,
    });
    expect(depois.status).toBe(204);
  });

  it('e-mail inexistente bloqueia do mesmo jeito, com a mesma mensagem', async () => {
    const db = await abrir();
    const conta = await criarConta(db, fabrica);
    const fantasma = 'fantasma@teste.invalid';
    fabrica.registrar(async () => {
      await kyselyDe(db).deleteFrom('tentativas_login').where('email', '=', fantasma).execute();
    });
    for (let i = 0; i < 5; i++) {
      await clienteEm('2026-10-16', `12:0${i}`).post('/api/sessao/entrar', { email: fantasma, senha: 'qualquer-123' });
    }
    const a = await clienteEm('2026-10-16', '12:06').post('/api/sessao/entrar', { email: fantasma, senha: 'x' });
    for (let i = 0; i < 5; i++) {
      await clienteEm('2026-10-16', `12:0${i}`).post('/api/sessao/entrar', {
        email: conta.email,
        senha: 'qualquer-123',
      });
    }
    const b = await clienteEm('2026-10-16', '12:06').post('/api/sessao/entrar', { email: conta.email, senha: 'x' });
    expect(a.status).toBe(429);
    expect(b.status).toBe(429);
    expect((a.corpo as { erro: { mensagem: string } }).erro.mensagem).toBe(
      (b.corpo as { erro: { mensagem: string } }).erro.mensagem,
    );
  });

  it('corpo inválido: 422 sem ecoar a senha', async () => {
    const r = await clienteEm('2026-10-16').post('/api/sessao/entrar', {
      email: 'sem-arroba',
      senha: 'segredo-que-nao-pode-voltar',
    });
    expect(r.status).toBe(422);
    expect(r.texto).not.toContain('segredo-que-nao-pode-voltar');
  });

  it('nenhum log contém a senha', async () => {
    const db = await abrir();
    const conta = await criarConta(db, fabrica);
    const espioes = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) =>
      vi.spyOn(console, m).mockImplementation(() => undefined),
    );
    await clienteEm('2026-10-16').post('/api/sessao/entrar', { email: conta.email, senha: 'senha-no-log-proibida' });
    await clienteEm('2026-10-16').post('/api/sessao/entrar', { email: conta.email, senha: conta.senha });
    expect(JSON.stringify(espioes.flatMap((e) => e.mock.calls))).not.toContain('senha-no-log-proibida');
    espioes.forEach((e) => e.mockRestore());
  });
});
