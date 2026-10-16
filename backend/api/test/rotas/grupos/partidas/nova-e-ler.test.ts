import { erroPadrao, partidaDetalhe, partidaNova } from '@pelada/contrato';
import { describe, expect, it } from 'vitest';
import { emTransacao } from '../../../../src/infraestrutura/db/index.js';
import * as jogadores from '../../../../src/infraestrutura/db/repositorios/jogadores.js';
import * as partidas from '../../../../src/infraestrutura/db/repositorios/partidas.js';
import { montarCenario } from '../../../apoio/cenario-acesso.js';
import { clienteTeste } from '../../../apoio/cliente.js';
import { usarDbDoWorker } from '../../../apoio/db-worker.js';
import { criarConta } from '../../../apoio/fabricas/contas.js';
import { criarJogador } from '../../../apoio/fabricas/jogadores.js';
import { usarFabrica } from '../../../apoio/fabrica.js';
import { relogioFixo } from '../../../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);
const AGORA = new Date('2026-10-22T15:00:00Z');
// o grupo de fábrica joga às quintas; 2026-10-22 é quinta
const cliente = (cookie: string, data = '2026-10-22') => clienteTeste({ relogio: relogioFixo(data), cookie });

describe('GET /api/grupos/:g/partidas/nova (workerd)', () => {
  it('data padrão = sugerida; ativos por apelido e todos ausentes; hoje depois do dia de jogo sugere a véspera', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    await criarJogador(db, g, cen.adminA.id, { apelido: 'beto', dataEntrada: '2026-01-01' });
    await criarJogador(db, g, cen.adminA.id, { apelido: 'Álvaro', dataEntrada: '2026-01-01' });
    await criarJogador(db, g, cen.adminA.id, { apelido: 'Entrou Depois', dataEntrada: '2026-10-22' });
    const saiu = await criarJogador(db, g, cen.adminA.id, { apelido: 'Saiu', dataEntrada: '2026-01-01' });
    await jogadores.inativar(db, g, saiu, '2026-10-22');
    await criarJogador(db, cen.grupoB.id, cen.adminB.id, { apelido: 'Alheio' });

    const r = await cliente(cen.adminA.cookie).get(`/api/grupos/${g}/partidas/nova`);
    expect(r.status).toBe(200);
    const nova = partidaNova.parse(r.corpo);
    expect(nova).toMatchObject({
      data: '2026-10-22',
      dataSugerida: '2026-10-22',
      jaExiste: false,
      preMarcadaPelaEscalacao: false,
    });
    expect(nova.jogadores.map((j) => [j.apelido, j.situacao])).toEqual([
      ['Álvaro', 'ausente'],
      ['beto', 'ausente'],
      ['Entrou Depois', 'ausente'],
    ]);
    const sexta = await cliente(cen.adminA.cookie, '2026-10-23').get(`/api/grupos/${g}/partidas/nova`);
    expect((sexta.corpo as { dataSugerida: string }).dataSugerida).toBe('2026-10-22');
  });

  it('data futura e inválida: 422 em data; já lançada: 409 com a data existente', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    for (const ruim of ['2026-10-23', '2026-02-30', 'abc']) {
      const r = await cliente(cen.adminA.cookie).get(`/api/grupos/${g}/partidas/nova?data=${ruim}`);
      expect(r.status, ruim).toBe(422);
      expect(Object.keys((r.corpo as { erro: { campos: object } }).erro.campos)).toEqual(['data']);
    }
    await emTransacao(db, (tx) =>
      partidas.criar(tx, g, { data: '2026-10-15', choveu: false, presencas: [], autor: cen.adminA.id, agora: AGORA }),
    );
    const dup = await cliente(cen.adminA.cookie).get(`/api/grupos/${g}/partidas/nova?data=2026-10-15`);
    expect(dup.status).toBe(409);
    expect(dup.corpo).toMatchObject({ erro: { codigo: 'partida_ja_existe', dataExistente: '2026-10-15' } });
    expect((await cliente(cen.adminB.cookie).get(`/api/grupos/${g}/partidas/nova`)).status).toBe(404);
  });
});

describe('GET /api/grupos/:g/partidas/:data (workerd)', () => {
  it('presenças P/L/E, ausentes e última alteração (nome e momento)', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const a = await criarJogador(db, g, cen.adminA.id, { apelido: 'Ana', dataEntrada: '2026-01-01' });
    const b = await criarJogador(db, g, cen.adminA.id, { apelido: 'Beto', dataEntrada: '2026-01-01' });
    await criarJogador(db, g, cen.adminA.id, { apelido: 'Caio', dataEntrada: '2026-01-01' });
    await criarJogador(db, g, cen.adminA.id, { apelido: 'Depois', dataEntrada: '2026-10-20' });
    const editor = await criarConta(db, fabrica, { nome: 'Editor' });
    await emTransacao(db, (tx) =>
      partidas.criar(tx, g, {
        data: '2026-10-15',
        choveu: true,
        presencas: [
          { jogadorId: a, situacao: 'presente' },
          { jogadorId: b, situacao: 'expulso' },
        ],
        autor: cen.adminA.id,
        agora: AGORA,
      }),
    );
    const criada = await cliente(cen.adminA.cookie).get(`/api/grupos/${g}/partidas/2026-10-15`);
    expect(criada.status).toBe(200);
    const d = partidaDetalhe.parse(criada.corpo);
    expect(d.jogadores.map((j) => [j.apelido, j.situacao])).toEqual([
      ['Ana', 'presente'],
      ['Beto', 'expulso'],
      ['Caio', 'ausente'],
    ]);
    expect(d).toMatchObject({ choveu: true, alteradaPor: 'Admin A', alteradaEm: '2026-10-22T15:00:00.000Z' });
    await emTransacao(db, (tx) =>
      partidas.substituir(tx, g, '2026-10-15', {
        choveu: false,
        presencas: [{ jogadorId: a, situacao: 'presente' }],
        autor: editor.id,
        agora: new Date('2026-10-23T10:00:00Z'),
      }),
    );
    const editada = await cliente(cen.adminA.cookie).get(`/api/grupos/${g}/partidas/2026-10-15`);
    expect(editada.corpo).toMatchObject({ alteradaPor: 'Editor', alteradaEm: '2026-10-23T10:00:00.000Z' });
  });

  it('data sem partida, data impossível e outro grupo: 404; "nova" não cai aqui', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    for (const ruim of ['2026-10-14', '2026-02-30', '2026-13-01']) {
      expect((await cliente(cen.adminA.cookie).get(`/api/grupos/${g}/partidas/${ruim}`)).status, ruim).toBe(404);
    }
    const nova = await cliente(cen.adminA.cookie).get(`/api/grupos/${g}/partidas/nova`);
    expect(erroPadrao.safeParse(nova.corpo).success).toBe(false);
    expect(nova.status).toBe(200);
  });
});
