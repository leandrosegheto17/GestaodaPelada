import { contextoSimulador } from '@pelada/contrato';
import { describe, expect, it } from 'vitest';
import { montarCenario } from '../../apoio/cenario-acesso.js';
import { clienteTeste } from '../../apoio/cliente.js';
import { usarDbDoWorker } from '../../apoio/db-worker.js';
import { criarJogador } from '../../apoio/fabricas/jogadores.js';
import { usarFabrica } from '../../apoio/fabrica.js';
import { relogioFixo } from '../../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);
const cliente = (cookie?: string, hoje = '2026-10-22') =>
  clienteTeste({ relogio: relogioFixo(hoje), ...(cookie ? { cookie } : {}) });

describe('GET /api/grupos/:g/simulador/contexto (workerd)', () => {
  it('200 no formato do contrato, sem ano de nascimento nem telefone', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    await criarJogador(db, cen.grupoA.id, cen.adminA.id, { apelido: 'Toninho' });
    const r = await cliente(cen.adminA.cookie).get(`/api/grupos/${cen.grupoA.id}/simulador/contexto`);
    expect(r.status).toBe(200);
    expect(r.headers.get('Cache-Control')).toBe('no-store');
    const contexto = contextoSimulador.parse(r.corpo);
    expect(contexto).toMatchObject({ dataSugerida: '2026-10-22', hoje: '2026-10-22' });
    expect(r.texto).not.toMatch(/anoNascimento|telefone|posicao/);
  });

  it('sem ativos devolve a lista vazia', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const r = await cliente(cen.adminA.cookie).get(`/api/grupos/${cen.grupoA.id}/simulador/contexto`);
    expect(contextoSimulador.parse(r.corpo).jogadores).toEqual([]);
  });

  it('?data aceita a data e recusa a malformada ou inexistente com 422 em data', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const url = `/api/grupos/${cen.grupoA.id}/simulador/contexto`;
    expect((await cliente(cen.adminA.cookie).get(`${url}?data=2026-11-05`)).status).toBe(200);
    for (const ruim of ['2026-02-30', 'abc']) {
      const r = await cliente(cen.adminA.cookie).get(`${url}?data=${ruim}`);
      expect(r.status).toBe(422);
      expect(Object.keys((r.corpo as { erro: { campos: object } }).erro.campos)).toEqual(['data']);
    }
  });

  it('sem sessão 401; admin de outro grupo e id malformado 404', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const url = `/api/grupos/${cen.grupoA.id}/simulador/contexto`;
    expect((await cliente().get(url)).status).toBe(401);
    expect((await cliente(cen.adminB.cookie).get(url)).status).toBe(404);
    expect((await cliente(cen.adminA.cookie).get('/api/grupos/nao-e-uuid/simulador/contexto')).status).toBe(404);
  });
});
