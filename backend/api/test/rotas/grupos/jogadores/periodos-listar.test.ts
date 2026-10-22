import { jogadorDetalhe, periodosResposta } from '@pelada/contrato';
import { sql } from 'kysely';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { kyselyDe } from '../../../../src/infraestrutura/db/cliente.js';
import * as jogadoresRepo from '../../../../src/infraestrutura/db/repositorios/jogadores.js';
import { montarCenario } from '../../../apoio/cenario-acesso.js';
import { clienteTeste } from '../../../apoio/cliente.js';
import { usarDbDoWorker } from '../../../apoio/db-worker.js';
import { criarJogador } from '../../../apoio/fabricas/jogadores.js';
import { usarFabrica } from '../../../apoio/fabrica.js';
import { relogioFixo } from '../../../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);
const cliente = (cookie?: string) =>
  clienteTeste({ relogio: relogioFixo('2026-10-22'), ...(cookie ? { cookie } : {}) });
const url = (g: string, i: string) => `/api/grupos/${g}/jogadores/${i}/periodos`;

describe('GET /api/grupos/:g/jogadores/:id/periodos (workerd)', () => {
  it('Gil: entrada encerrada e retorno aberto, com os ids de periodos_ativos', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const id = await criarJogador(db, g, cen.adminA.id, { dataEntrada: '2026-02-05' });
    await jogadoresRepo.inativar(db, g, id, '2026-10-05');
    await jogadoresRepo.reativar(db, g, id, '2026-10-20');
    const [p1, p2] = (await jogadoresRepo.buscar(db, g, id))?.periodos ?? [];

    const r = await cliente(cen.adminA.cookie).get(url(g, id));
    expect(r.status).toBe(200);
    expect(r.headers.get('Cache-Control')).toBe('no-store');
    expect(periodosResposta.safeParse(r.corpo).success).toBe(true);
    expect(r.corpo).toEqual({
      periodos: [
        {
          id: p1!.id,
          tipo: 'entrada',
          inicio: '2026-02-05',
          fim: '2026-10-05',
          corrigivel: { saida: true, retorno: false },
        },
        { id: p2!.id, tipo: 'retorno', inicio: '2026-10-20', fim: null, corrigivel: { saida: false, retorno: true } },
      ],
    });
  });

  it('Toninho inativo: um período encerrado; jogador com período aberto não corrige nada', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const toninho = await criarJogador(db, g, cen.adminA.id, { dataEntrada: '2026-02-05' });
    await jogadoresRepo.inativar(db, g, toninho, '2026-10-22');
    const aberto = await criarJogador(db, g, cen.adminA.id, { dataEntrada: '2026-02-05' });
    const [pt] = (await jogadoresRepo.buscar(db, g, toninho))?.periodos ?? [];
    const [pa] = (await jogadoresRepo.buscar(db, g, aberto))?.periodos ?? [];

    const rt = await cliente(cen.adminA.cookie).get(url(g, toninho));
    expect(rt.corpo).toEqual({
      periodos: [
        {
          id: pt!.id,
          tipo: 'entrada',
          inicio: '2026-02-05',
          fim: '2026-10-22',
          corrigivel: { saida: true, retorno: false },
        },
      ],
    });
    const ra = await cliente(cen.adminA.cookie).get(url(g, aberto));
    expect(ra.corpo).toEqual({
      periodos: [
        { id: pa!.id, tipo: 'entrada', inicio: '2026-02-05', fim: null, corrigivel: { saida: false, retorno: false } },
      ],
    });
  });

  it('ordem cronológica mesmo com período inserido fora de ordem', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const id = await criarJogador(db, g, cen.adminA.id, { dataEntrada: '2026-08-01' });
    await sql`INSERT INTO periodos_ativos (jogador_id, grupo_id, inicio, fim)
      VALUES (${id}, ${g}, ${'2026-01-01'}::date, ${'2026-03-01'}::date)`.execute(kyselyDe(db));
    const r = await cliente(cen.adminA.cookie).get(url(g, id));
    const lista = (r.corpo as { periodos: { tipo: string; inicio: string }[] }).periodos;
    expect(lista.map((p) => [p.tipo, p.inicio])).toEqual([
      ['entrada', '2026-01-01'],
      ['retorno', '2026-08-01'],
    ]);
  });

  it('404 genérico para inexistente, outro grupo, malformado e não admin do grupo; sem sessão 401', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const id = await criarJogador(db, g, cen.adminA.id);

    const inexistente = await cliente(cen.adminA.cookie).get(url(g, randomUUID()));
    expect(inexistente.status).toBe(404);
    expect((await cliente(cen.adminA.cookie).get(url(cen.grupoB.id, id))).status).toBe(404);
    const deB = await cliente(cen.adminB.cookie).get(url(g, id));
    expect(deB.status).toBe(404);
    expect(deB.corpo).toEqual(inexistente.corpo);
    for (const ruim of ['abc', encodeURIComponent("' OR 1=1")]) {
      const r = await cliente(cen.adminA.cookie).get(url(g, ruim));
      expect(r.status).toBe(404);
      expect(r.corpo).toEqual(inexistente.corpo);
    }
    expect((await cliente().get(url(g, id))).status).toBe(401);
  });

  it('GET do jogador continua sem o campo periodos', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const id = await criarJogador(db, g, cen.adminA.id);
    const r = await cliente(cen.adminA.cookie).get(`/api/grupos/${g}/jogadores/${id}`);
    expect(r.status).toBe(200);
    expect(jogadorDetalhe.safeParse(r.corpo).success).toBe(true);
    expect(Object.keys(r.corpo as object)).not.toContain('periodos');
  });
});
