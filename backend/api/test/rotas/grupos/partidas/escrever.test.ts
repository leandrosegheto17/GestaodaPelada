import { grupoDetalhe, partidaDetalhe } from '@pelada/contrato';
import { describe, expect, it } from 'vitest';
import { kyselyDe } from '../../../../src/infraestrutura/db/cliente.js';
import { montarCenario } from '../../../apoio/cenario-acesso.js';
import { clienteTeste } from '../../../apoio/cliente.js';
import { usarDbDoWorker } from '../../../apoio/db-worker.js';
import { criarJogador } from '../../../apoio/fabricas/jogadores.js';
import { usarFabrica } from '../../../apoio/fabrica.js';
import { relogioFixo } from '../../../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);
const cliente = (cookie: string, data = '2026-10-22') => clienteTeste({ relogio: relogioFixo(data), cookie });

async function base() {
  const db = await abrir();
  const cen = await montarCenario(db, fabrica);
  const g = cen.grupoA.id;
  const a = await criarJogador(db, g, cen.adminA.id, { apelido: 'Ana', dataEntrada: '2026-01-01' });
  const b = await criarJogador(db, g, cen.adminA.id, { apelido: 'Beto', dataEntrada: '2026-01-01' });
  const depois = await criarJogador(db, g, cen.adminA.id, { apelido: 'Depois', dataEntrada: '2026-10-20' });
  const alheio = await criarJogador(db, cen.grupoB.id, cen.adminB.id, { apelido: 'Alheio' });
  return { db, cen, g, a, b, depois, alheio };
}

describe('POST /api/grupos/:g/partidas (workerd)', () => {
  it('grava partida, presenças, evento de uso e auditoria; a faixa do início passa a mostrar a partida', async () => {
    const { db, cen, g, a, b } = await base();
    const corpo = {
      data: '2026-10-22',
      choveu: true,
      marcacoes: [
        { jogadorId: a, situacao: 'presente' },
        { jogadorId: b, situacao: 'expulso' },
      ],
    };
    const r = await cliente(cen.adminA.cookie).post(`/api/grupos/${g}/partidas`, corpo);
    expect(r.status).toBe(201);
    expect(partidaDetalhe.parse(r.corpo)).toMatchObject({ data: '2026-10-22', choveu: true, alteradaPor: 'Admin A' });
    const banco = kyselyDe(db);
    expect(await banco.selectFrom('presencas').select('situacao').where('grupo_id', '=', g).execute()).toHaveLength(2);
    expect(await banco.selectFrom('eventos_uso').select('tipo').where('grupo_id', '=', g).execute()).toEqual([
      { tipo: 'partida_lancada' },
    ]);
    const auditoria = await banco
      .selectFrom('auditoria')
      .select(['acao', 'resumo'])
      .where('grupo_id', '=', g)
      .execute();
    expect(auditoria).toMatchObject([
      { acao: 'partida_lancada', resumo: { presentes: 1, expulsos: 1, lesionados: 0 } },
    ]);
    const inicio = grupoDetalhe.parse((await cliente(cen.adminA.cookie).get(`/api/grupos/${g}`)).corpo);
    expect(inicio.inicio.partidaNaDataSugerida).toBe(true);
  });

  it('data futura 422; duplicada 409 com a data; jogador inativo na data ou de outro grupo 422 apontando a marcação', async () => {
    const { cen, g, a, depois, alheio } = await base();
    const url = `/api/grupos/${g}/partidas`;
    const futura = await cliente(cen.adminA.cookie).post(url, { data: '2026-10-23', choveu: false, marcacoes: [] });
    expect(futura.status).toBe(422);
    expect(Object.keys((futura.corpo as { erro: { campos: object } }).erro.campos)).toEqual(['data']);

    const inativo = await cliente(cen.adminA.cookie).post(url, {
      data: '2026-10-15',
      choveu: false,
      marcacoes: [
        { jogadorId: a, situacao: 'presente' },
        { jogadorId: depois, situacao: 'presente' },
        { jogadorId: alheio, situacao: 'presente' },
      ],
    });
    expect(inativo.status).toBe(422);
    expect(Object.keys((inativo.corpo as { erro: { campos: object } }).erro.campos).sort()).toEqual([
      'marcacoes.1.jogadorId',
      'marcacoes.2.jogadorId',
    ]);
    expect((await cliente(cen.adminA.cookie).get(`/api/grupos/${g}/partidas/2026-10-15`)).status).toBe(404);

    const ok = { data: '2026-10-15', choveu: false, marcacoes: [{ jogadorId: a, situacao: 'presente' }] };
    expect((await cliente(cen.adminA.cookie).post(url, ok)).status).toBe(201);
    const duplicada = await cliente(cen.adminA.cookie).post(url, ok);
    expect(duplicada.status).toBe(409);
    expect(duplicada.corpo).toMatchObject({ erro: { codigo: 'partida_ja_existe', dataExistente: '2026-10-15' } });
  });

  it('falha no evento ou na auditoria desfaz tudo', async () => {
    const { db, cen, g, a } = await base();
    const { lancarPartida } = await import('../../../../src/aplicacao/partidas/lancar.js');
    await expect(
      lancarPartida(
        db,
        g,
        { data: '2026-10-15', choveu: false, marcacoes: [{ jogadorId: a, situacao: 'presente' }] },
        { autorContaId: cen.adminA.id, agora: new Date('2026-10-22T15:00:00Z'), hoje: '2026-10-22' },
        {
          registrarEvento: async () => undefined,
          registrarAuditoria: async () => {
            throw new Error('falha forçada');
          },
        },
      ),
    ).rejects.toThrow('falha forçada');
    const banco = kyselyDe(db);
    expect(await banco.selectFrom('partidas').select('id').where('grupo_id', '=', g).execute()).toEqual([]);
    expect(await banco.selectFrom('presencas').select('partida_id').where('grupo_id', '=', g).execute()).toEqual([]);
  });

  it('falha ao registrar o evento desfaz partida, presença e auditoria', async () => {
    const { db, cen, g, a } = await base();
    const { lancarPartida } = await import('../../../../src/aplicacao/partidas/lancar.js');
    await expect(
      lancarPartida(
        db,
        g,
        { data: '2026-10-15', choveu: false, marcacoes: [{ jogadorId: a, situacao: 'presente' }] },
        { autorContaId: cen.adminA.id, agora: new Date('2026-10-22T15:00:00Z'), hoje: '2026-10-22' },
        {
          registrarEvento: async () => {
            throw new Error('falha no evento');
          },
          registrarAuditoria: async () => undefined,
        },
      ),
    ).rejects.toThrow('falha no evento');
    const banco = kyselyDe(db);
    expect(await banco.selectFrom('partidas').select('id').where('grupo_id', '=', g).execute()).toEqual([]);
    expect(await banco.selectFrom('presencas').select('partida_id').where('grupo_id', '=', g).execute()).toEqual([]);
    expect(await banco.selectFrom('auditoria').select('id').where('grupo_id', '=', g).execute()).toEqual([]);
  });

  it('duas chamadas simultâneas na mesma data: um 201, um 409 e um único evento', async () => {
    const { db, cen, g, a } = await base();
    const corpo = { data: '2026-10-15', choveu: false, marcacoes: [{ jogadorId: a, situacao: 'presente' }] };
    const url = `/api/grupos/${g}/partidas`;
    const rs = await Promise.all([
      cliente(cen.adminA.cookie).post(url, corpo),
      cliente(cen.adminA.cookie).post(url, corpo),
    ]);
    expect(rs.map((r) => r.status).sort()).toEqual([201, 409]);
    const banco = kyselyDe(db);
    expect(await banco.selectFrom('partidas').select('id').where('grupo_id', '=', g).execute()).toHaveLength(1);
    expect(await banco.selectFrom('eventos_uso').select('tipo').where('grupo_id', '=', g).execute()).toEqual([
      { tipo: 'partida_lancada' },
    ]);
  });

  it.each([
    ['data inexistente', { data: '2026-02-30', choveu: false, marcacoes: [] }],
    ['campo extra', { data: '2026-10-15', choveu: false, marcacoes: [], extra: 1 }],
    ['choveu ausente', { data: '2026-10-15', marcacoes: [] }],
  ])('corpo inválido (%s): 422 e nada gravado', async (_nome, corpo) => {
    const { db, cen, g } = await base();
    const r = await cliente(cen.adminA.cookie).post(`/api/grupos/${g}/partidas`, corpo);
    expect(r.status).toBe(422);
    expect(await kyselyDe(db).selectFrom('partidas').select('id').where('grupo_id', '=', g).execute()).toEqual([]);
  });

  it('jogadorId repetido nas marcações: 422', async () => {
    const { cen, g, a } = await base();
    const r = await cliente(cen.adminA.cookie).post(`/api/grupos/${g}/partidas`, {
      data: '2026-10-15',
      choveu: false,
      marcacoes: [
        { jogadorId: a, situacao: 'presente' },
        { jogadorId: a, situacao: 'expulso' },
      ],
    });
    expect(r.status).toBe(422);
  });
});

describe('PUT /api/grupos/:g/partidas/:data (workerd)', () => {
  it('substitui choveu e presenças, audita, e recusa trocar a data', async () => {
    const { db, cen, g, a, b } = await base();
    const url = `/api/grupos/${g}/partidas/2026-10-15`;
    await cliente(cen.adminA.cookie).post(`/api/grupos/${g}/partidas`, {
      data: '2026-10-15',
      choveu: false,
      marcacoes: [{ jogadorId: a, situacao: 'presente' }],
    });
    const r = await cliente(cen.adminA.cookie).put(url, {
      data: '2026-10-15',
      choveu: true,
      marcacoes: [{ jogadorId: b, situacao: 'lesionado' }],
    });
    expect(r.status).toBe(200);
    const d = partidaDetalhe.parse(r.corpo);
    expect(d.choveu).toBe(true);
    expect(d.jogadores.map((j) => [j.apelido, j.situacao])).toEqual([
      ['Ana', 'ausente'],
      ['Beto', 'lesionado'],
    ]);
    const acoes = await kyselyDe(db)
      .selectFrom('auditoria')
      .select('acao')
      .where('grupo_id', '=', g)
      .orderBy('id')
      .execute();
    expect(acoes.map((x) => x.acao)).toEqual(['partida_lancada', 'partida_editada']);
    const troca = await cliente(cen.adminA.cookie).put(url, { data: '2026-10-14', choveu: false, marcacoes: [] });
    expect(troca.status).toBe(422);
    expect(Object.keys((troca.corpo as { erro: { campos: object } }).erro.campos)).toEqual(['data']);
  });

  it('data sem partida, malformada e outro grupo: 404', async () => {
    const { cen, g } = await base();
    const corpo = { data: '2026-10-14', choveu: false, marcacoes: [] };
    expect((await cliente(cen.adminA.cookie).put(`/api/grupos/${g}/partidas/2026-10-14`, corpo)).status).toBe(404);
    expect((await cliente(cen.adminA.cookie).put(`/api/grupos/${g}/partidas/2026-02-30`, corpo)).status).toBe(404);
    expect((await cliente(cen.adminB.cookie).put(`/api/grupos/${g}/partidas/2026-10-14`, corpo)).status).toBe(404);
  });
});

describe('DELETE /api/grupos/:g/partidas/:data (workerd)', () => {
  it('exclui partida e presenças com auditoria; depois o dia pode ser lançado de novo', async () => {
    const { db, cen, g, a } = await base();
    const corpo = { data: '2026-10-15', choveu: false, marcacoes: [{ jogadorId: a, situacao: 'presente' }] };
    await cliente(cen.adminA.cookie).post(`/api/grupos/${g}/partidas`, corpo);
    const r = await cliente(cen.adminA.cookie).delete(`/api/grupos/${g}/partidas/2026-10-15`);
    expect(r.status).toBe(204);
    expect((await cliente(cen.adminA.cookie).get(`/api/grupos/${g}/partidas/2026-10-15`)).status).toBe(404);
    const banco = kyselyDe(db);
    expect(await banco.selectFrom('presencas').select('partida_id').where('grupo_id', '=', g).execute()).toEqual([]);
    const acoes = await banco.selectFrom('auditoria').select('acao').where('grupo_id', '=', g).orderBy('id').execute();
    expect(acoes.map((x) => x.acao)).toEqual(['partida_lancada', 'partida_excluida']);
    expect((await cliente(cen.adminA.cookie).post(`/api/grupos/${g}/partidas`, corpo)).status).toBe(201);
    expect((await cliente(cen.adminA.cookie).delete(`/api/grupos/${g}/partidas/2026-10-14`)).status).toBe(404);
    expect((await cliente(cen.adminB.cookie).delete(`/api/grupos/${g}/partidas/2026-10-15`)).status).toBe(404);
  });
});
