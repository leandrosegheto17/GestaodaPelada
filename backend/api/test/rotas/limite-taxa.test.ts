import { erroPadrao } from '@pelada/contrato';
import { env } from 'cloudflare:test';
import { describe, expect, it, vi } from 'vitest';
import { criarApp } from '../../src/entrada/app.js';
import type { Limitador } from '../../src/entrada/middlewares/limite-taxa.js';
import { kyselyDe } from '../../src/infraestrutura/db/cliente.js';
import { clienteTeste } from '../apoio/cliente.js';
import { usarDbDoWorker } from '../apoio/db-worker.js';
import { usarFabrica } from '../apoio/fabrica.js';
import { criarConta } from '../apoio/fabricas/contas.js';
import { criarGrupo, vincularAdmin } from '../apoio/fabricas/grupos.js';
import { relogioFixo } from '../apoio/relogio.js';
import { entrarComo } from '../apoio/sessao.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);
/** Faixa de documentação (RFC 5737). */
const IP_A = '203.0.113.1';
const IP_B = '203.0.113.2';

/** Limitador falso com contador por chave, como o binding de verdade (janela única, sem tempo). */
function limitadorDe(limite: number): Limitador & { chaves: string[] } {
  const contagem = new Map<string, number>();
  const chaves: string[] = [];
  return {
    chaves,
    limit: async ({ key }) => {
      chaves.push(key);
      const n = (contagem.get(key) ?? 0) + 1;
      contagem.set(key, n);
      return { success: n <= limite };
    },
  };
}

describe('limite de taxa por IP (workerd)', () => {
  it('login: a 11ª tentativa do mesmo IP dá 429 no formato padrão, sem abrir conexão', async () => {
    const limitador = limitadorDe(10);
    const db = await abrir();
    const cliente = clienteTeste({
      relogio: relogioFixo('2026-10-22'),
      limitadores: { entrar: limitador },
      cabecalhos: { 'CF-Connecting-IP': IP_A },
    });
    // E-mails distintos e únicos por execução: o bloqueio por e-mail do login também responde 429
    // e as tentativas ficam gravadas no banco compartilhado.
    const sufixo = crypto.randomUUID();
    const emails = Array.from({ length: 11 }, (_, i) => `ninguem${i}-${sufixo}@teste.invalid`);
    fabrica.registrar(async () => {
      await kyselyDe(db).deleteFrom('tentativas_login').where('email', 'in', emails).execute();
    });
    const corpo = (i: number) => ({ email: emails[i]!, senha: 'qualquer-123' });
    for (let i = 0; i < 10; i++) expect((await cliente.post('/api/sessao/entrar', corpo(i))).status).not.toBe(429);
    const r = await cliente.post('/api/sessao/entrar', corpo(10));
    expect(r.status).toBe(429);
    expect(erroPadrao.safeParse(r.corpo).success).toBe(true);
    expect(r.corpo).toMatchObject({ erro: { codigo: 'muitas_requisicoes' } });
    expect(r.texto).not.toContain('liberaEm');
    expect(r.headers.get('Cache-Control')).toBe('no-store');
    // LGPD: o IP é só chave do limitador, não vai para o banco.
    const linhas = await kyselyDe(db).selectFrom('tentativas_login').selectAll().where('email', 'in', emails).execute();
    expect(linhas.length).toBeGreaterThan(0);
    expect(JSON.stringify(linhas)).not.toContain('203.0.113.');
  }, 60_000);

  it('o limite é por IP: outro IP não recebe 429 depois que o primeiro estourou', async () => {
    const limitador = limitadorDe(1);
    const a = clienteTeste({ limitadores: { publico: limitador }, cabecalhos: { 'CF-Connecting-IP': IP_A } });
    const b = clienteTeste({ limitadores: { publico: limitador }, cabecalhos: { 'CF-Connecting-IP': IP_B } });
    expect((await a.get('/api/publico/nao-existe/ranking')).status).not.toBe(429);
    expect((await a.get('/api/publico/nao-existe/ranking')).status).toBe(429);
    expect((await b.get('/api/publico/nao-existe/ranking')).status).not.toBe(429);
    expect(limitador.chaves).toEqual([IP_A, IP_A, IP_B]);
  });

  it('POST de eventos públicos conta no mesmo limitador do público', async () => {
    const publico = limitadorDe(1);
    const cliente = clienteTeste({ limitadores: { publico } });
    expect((await cliente.get('/api/publico/nao-existe/ranking')).status).not.toBe(429);
    const r = await cliente.post('/api/publico/nao-existe/eventos', { tipo: 'visualizou' });
    expect(r.status).toBe(429);
    expect(r.headers.get('Cache-Control')).toBe('no-store');
    expect(publico.chaves).toHaveLength(2);
  });

  it('429 não abre conexão com o banco', async () => {
    let acessos = 0;
    const envEspiao = new Proxy(env, {
      get(alvo, prop, receptor) {
        if (prop === 'HYPERDRIVE') acessos++;
        return Reflect.get(alvo, prop, receptor);
      },
    });
    const cliente = clienteTeste({ limitadores: { entrar: limitadorDe(0), publico: limitadorDe(0) }, env: envEspiao });
    expect((await cliente.post('/api/sessao/entrar', { email: 'a@b.com', senha: 'x' })).status).toBe(429);
    expect((await cliente.get('/api/publico/nao-existe/ranking')).status).toBe(429);
    expect(acessos).toBe(0);
  });

  it('saúde e sessão/eu nunca recebem 429, mesmo com os limitadores em 0', async () => {
    const cliente = clienteTeste({ limitadores: { entrar: limitadorDe(0), publico: limitadorDe(0) } });
    expect((await cliente.get('/api/saude')).status).toBe(200);
    expect((await cliente.get('/api/sessao/eu')).status).not.toBe(429);
  });

  it('público: 60 por IP; rotas do admin não passam pelo limitador público', async () => {
    const publico = limitadorDe(60);
    const db = await abrir();
    const conta = await criarConta(db, fabrica, { nome: 'Admin limite' });
    const grupo = await criarGrupo(db, fabrica, { criadoPor: conta.id, nome: 'Grupo limite' });
    await vincularAdmin(db, grupo.id, conta.id, { acessaFinanceiro: false });
    const { cookie } = await entrarComo(db, fabrica, conta.id);
    const cliente = clienteTeste({ relogio: relogioFixo('2026-10-22'), limitadores: { publico } });
    for (let i = 0; i < 60; i++) await cliente.get('/api/publico/nao-existe/ranking');
    expect((await cliente.get('/api/publico/nao-existe/ranking')).status).toBe(429);
    const admin = clienteTeste({
      relogio: relogioFixo('2026-10-22'),
      cookie,
      limitadores: { publico },
    });
    expect((await admin.get(`/api/grupos/${grupo.id}`)).status).toBe(200);
  }, 60_000);

  it('o IP só é chave: sem cabeçalho usa chave fixa; nunca aparece na resposta nem no log', async () => {
    const limitador = limitadorDe(0);
    const espiao = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const cliente = clienteTeste({ relogio: relogioFixo('2026-10-22'), limitadores: { entrar: limitador } });
    const r = await cliente.post('/api/sessao/entrar', { email: 'a@b.com', senha: 'x' });
    expect(r.status).toBe(429);
    expect(limitador.chaves).toEqual(['sem-ip']);
    expect(JSON.stringify(espiao.mock.calls)).not.toContain('sem-ip');
    espiao.mockRestore();
  });

  it('falha do próprio limitador deixa passar e registra só "limitador indisponível"', async () => {
    const espiao = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const quebrado: Limitador = {
      limit: async () => {
        throw new Error('segredo-interno');
      },
    };
    const cliente = clienteTeste({ relogio: relogioFixo('2026-10-22'), limitadores: { publico: quebrado } });
    expect((await cliente.get('/api/publico/nao-existe/ranking')).status).toBe(404);
    expect(JSON.stringify(espiao.mock.calls)).toContain('limitador indisponível');
    expect(JSON.stringify(espiao.mock.calls)).not.toContain('segredo-interno');
    espiao.mockRestore();
  });

  describe('binding ausente', () => {
    const base = { DONO_EMAIL: 'dono@teste.invalid' };
    async function chamar(urlPublica: string, vezes: number) {
      const app = criarApp();
      for (let i = 0; i < vezes; i++) {
        await app.request(
          '/api/sessao/entrar',
          { method: 'POST', headers: { 'CF-Connecting-IP': '203.0.113.9' } },
          { ...base, URL_PUBLICA: urlPublica },
        );
      }
    }

    it('implantado (https): registra "limitador ausente" uma vez, sem IP', async () => {
      const espiao = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      await chamar('https://app.exemplo.dev', 3);
      expect(espiao.mock.calls).toEqual([['limitador ausente']]);
      expect(JSON.stringify(espiao.mock.calls)).not.toContain('203.0.113.9');
      espiao.mockRestore();
    });

    it('local (http://localhost): não limita e não registra nada', async () => {
      const espiao = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      await chamar('http://localhost:8787', 2);
      expect(espiao).not.toHaveBeenCalled();
      espiao.mockRestore();
    });
  });
});
