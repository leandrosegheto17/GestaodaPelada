import { jogadorDetalhe, listaJogadores } from '@pelada/contrato';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { emTransacao } from '../../../../src/infraestrutura/db/index.js';
import * as habilidades from '../../../../src/infraestrutura/db/repositorios/habilidades.js';
import * as jogadores from '../../../../src/infraestrutura/db/repositorios/jogadores.js';
import * as partidas from '../../../../src/infraestrutura/db/repositorios/partidas.js';
import { montarCenario } from '../../../apoio/cenario-acesso.js';
import { clienteTeste } from '../../../apoio/cliente.js';
import { usarDbDoWorker } from '../../../apoio/db-worker.js';
import { criarJogador } from '../../../apoio/fabricas/jogadores.js';
import { usarFabrica } from '../../../apoio/fabrica.js';
import { relogioFixo } from '../../../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);
const HOJE = '2026-10-22';
const AGORA = new Date('2026-10-22T15:00:00Z');
const cliente = (cookie: string, data = HOJE) => clienteTeste({ relogio: relogioFixo(data), cookie });

describe('GET /api/grupos/:g/jogadores (workerd)', () => {
  it('ativos e inativos por apelido, com nível; filtro esvazia a outra lista', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const beto = await criarJogador(db, g, cen.adminA.id, { apelido: 'beto' });
    await criarJogador(db, g, cen.adminA.id, { apelido: 'Álvaro' });
    const caio = await criarJogador(db, g, cen.adminA.id, { apelido: 'Caio' });
    await jogadores.inativar(db, g, caio, '2026-08-10');
    const hab = await habilidades.criar(db, g, 'Passe');
    await habilidades.gravarNota(db, g, beto, hab, 8);

    const r = await cliente(cen.adminA.cookie).get(`/api/grupos/${g}/jogadores`);
    expect(r.status).toBe(200);
    const lista = listaJogadores.parse(r.corpo);
    expect(lista.ativos.map((j) => [j.apelido, j.nivel, j.semNota])).toEqual([
      ['Álvaro', 5.5, true],
      ['beto', 8, false],
    ]);
    expect(lista.inativos).toMatchObject([{ apelido: 'Caio', inativoDesde: '2026-08-10' }]);
    const soAtivos = await cliente(cen.adminA.cookie).get(`/api/grupos/${g}/jogadores?filtro=ativos`);
    expect((soAtivos.corpo as { inativos: unknown[] }).inativos).toEqual([]);
    const soInativos = await cliente(cen.adminA.cookie).get(`/api/grupos/${g}/jogadores?filtro=inativos`);
    expect((soInativos.corpo as { ativos: unknown[] }).ativos).toEqual([]);
    expect((await cliente(cen.adminA.cookie).get(`/api/grupos/${g}/jogadores?filtro=todos`)).status).toBe(422);
    expect(r.texto).not.toMatch(/telefone|anoNascimento/);
  });

  it('grupo sem jogadores devolve as duas listas vazias, sem cache; sem sessão 401; admin de outro grupo 404', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const r = await cliente(cen.adminA.cookie).get(`/api/grupos/${g}/jogadores`);
    expect(r.status).toBe(200);
    expect(r.corpo).toEqual({ ativos: [], inativos: [] });
    expect(r.headers.get('cache-control')).toMatch(/no-store/);
    expect((await clienteTeste({ relogio: relogioFixo(HOJE) }).get(`/api/grupos/${g}/jogadores`)).status).toBe(401);
    expect((await cliente(cen.adminB.cookie).get(`/api/grupos/${g}/jogadores`)).status).toBe(404);
  });
});

describe('GET /api/grupos/:g/jogadores/:id (workerd)', () => {
  it('detalhe com notas do catálogo e nível; outro grupo e id malformado dão 404', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const id = await criarJogador(db, g, cen.adminA.id, { apelido: 'Detalhe', dataEntrada: '2026-02-05' });
    const passe = await habilidades.criar(db, g, 'Passe');
    await habilidades.criar(db, g, 'Chute');
    await habilidades.gravarNota(db, g, id, passe, 7);
    const r = await cliente(cen.adminA.cookie).get(`/api/grupos/${g}/jogadores/${id}`);
    expect(r.status).toBe(200);
    const d = jogadorDetalhe.parse(r.corpo);
    expect(d.situacao).toEqual({ ativo: true, desde: '2026-02-05' });
    expect(d.notas.map((n) => [n.habilidade, n.nota])).toEqual([
      ['Passe', 7],
      ['Chute', null],
    ]);
    expect(d.nivel).toBe(7);
    expect((await cliente(cen.adminB.cookie).get(`/api/grupos/${cen.grupoB.id}/jogadores/${id}`)).status).toBe(404);
    expect((await cliente(cen.adminA.cookie).get(`/api/grupos/${g}/jogadores/${randomUUID()}`)).status).toBe(404);
    expect((await cliente(cen.adminA.cookie).get(`/api/grupos/${g}/jogadores/abc`)).status).toBe(404);
  });
});

describe('PATCH /api/grupos/:g/jogadores/:id (workerd)', () => {
  it('edita os dados e limpa o telefone; nova entrada move o primeiro período', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const id = await criarJogador(db, g, cen.adminA.id, { apelido: 'Editar', dataEntrada: '2026-05-01' });
    const r = await cliente(cen.adminA.cookie).patch(`/api/grupos/${g}/jogadores/${id}`, {
      apelido: 'Editado',
      anoNascimento: 1985,
      posicao: 'goleiro',
      telefone: null,
      dataEntrada: '2026-04-01',
    });
    expect(r.status).toBe(200);
    expect(r.corpo).toMatchObject({
      apelido: 'Editado',
      posicao: 'goleiro',
      telefone: null,
      situacao: { desde: '2026-04-01' },
    });
  });

  it('presença antes da nova entrada: 422 no campo dataEntrada (L-11)', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const id = await criarJogador(db, g, cen.adminA.id, { apelido: 'Presente', dataEntrada: '2026-01-01' });
    await emTransacao(db, (tx) =>
      partidas.criar(tx, g, {
        data: '2026-03-05',
        choveu: false,
        presencas: [{ jogadorId: id, situacao: 'presente' }],
        autor: cen.adminA.id,
        agora: AGORA,
      }),
    );
    const base = { apelido: 'Presente', anoNascimento: 1990, posicao: 'atacante' };
    const recusado = await cliente(cen.adminA.cookie).patch(`/api/grupos/${g}/jogadores/${id}`, {
      ...base,
      dataEntrada: '2026-03-06',
    });
    expect(recusado.status).toBe(422);
    expect(Object.keys((recusado.corpo as { erro: { campos: object } }).erro.campos)).toEqual(['dataEntrada']);
    const aceito = await cliente(cen.adminA.cookie).patch(`/api/grupos/${g}/jogadores/${id}`, {
      ...base,
      dataEntrada: '2026-03-05',
    });
    expect(aceito.status).toBe(200);
  });

  it('apelido repetido 422; jogador de outro grupo e malformado 404', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    await criarJogador(db, g, cen.adminA.id, { apelido: 'Existente' });
    const id = await criarJogador(db, g, cen.adminA.id, { apelido: 'Outro' });
    const base = { anoNascimento: 1990, posicao: 'atacante' };
    const r = await cliente(cen.adminA.cookie).patch(`/api/grupos/${g}/jogadores/${id}`, {
      ...base,
      apelido: 'existente',
    });
    expect(r.status).toBe(422);
    expect(
      (
        await cliente(cen.adminB.cookie).patch(`/api/grupos/${cen.grupoB.id}/jogadores/${id}`, {
          ...base,
          apelido: 'X Y',
        })
      ).status,
    ).toBe(404);
    expect(
      (await cliente(cen.adminA.cookie).patch(`/api/grupos/${g}/jogadores/abc`, { ...base, apelido: 'X Y' })).status,
    ).toBe(404);
  });
});
