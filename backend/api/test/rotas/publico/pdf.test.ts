import { projecaoPdf, rankingPublico } from '@pelada/contrato';
import { PESOS_PADRAO } from '@pelada/dominio';
import { describe, expect, it } from 'vitest';
import { kyselyDe } from '../../../src/infraestrutura/db/cliente.js';
import { emTransacao } from '../../../src/infraestrutura/db/index.js';
import * as partidas from '../../../src/infraestrutura/db/repositorios/partidas.js';
import * as pesos from '../../../src/infraestrutura/db/repositorios/pesos.js';
import { montarCenario } from '../../apoio/cenario-acesso.js';
import { clienteTeste } from '../../apoio/cliente.js';
import { usarDbDoWorker } from '../../apoio/db-worker.js';
import { criarJogador } from '../../apoio/fabricas/jogadores.js';
import { usarFabrica } from '../../apoio/fabrica.js';
import { relogioFixo } from '../../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);
const AGORA = new Date('2026-10-22T15:00:00Z');
const anonimo = () => clienteTeste({ relogio: relogioFixo('2026-10-22') });

const PROIBIDAS = [
  'telefone',
  'anoNascimento',
  'idade',
  'notas',
  'nivel',
  'saldo',
  'jogadorId',
  'email',
  'id',
  'valor',
];
function chaves(no: unknown, saida: string[] = []): string[] {
  if (Array.isArray(no)) no.forEach((n) => chaves(n, saida));
  else if (no && typeof no === 'object') {
    for (const [k, v] of Object.entries(no)) {
      saida.push(k);
      chaves(v, saida);
    }
  }
  return saida;
}

async function grupoComHistorico(db: Awaited<ReturnType<typeof abrir>>) {
  const cen = await montarCenario(db, fabrica);
  const g = cen.grupoA.id;
  const a = await criarJogador(db, g, cen.adminA.id, { apelido: 'Ana', dataEntrada: '2026-01-01', ano: 1990 });
  const b = await criarJogador(db, g, cen.adminA.id, { apelido: 'Beto', dataEntrada: '2026-01-01', ano: 1985 });
  await pesos.criarPadrao(db, g, {
    pesos: PESOS_PADRAO,
    vigenteDesde: '2026-01-01',
    registradoPor: cen.adminA.id,
    agora: AGORA,
  });
  const datas = ['2026-07-02', '2026-08-06', '2026-09-24', '2026-10-01', '2026-10-08'];
  for (const [i, data] of datas.entries()) {
    const presencas = [
      { jogadorId: a, situacao: 'presente' as const },
      ...(i % 2 === 0 ? [{ jogadorId: b, situacao: 'expulso' as const }] : []),
    ];
    await emTransacao(db, (tx) =>
      partidas.criar(tx, g, { data, choveu: i === 4, presencas, autor: cen.adminA.id, agora: AGORA }),
    );
  }
  return cen;
}

describe('GET /api/publico/:slug/pdf (workerd)', () => {
  it('projeção do mês sem login: colunas cronológicas, soma fechando e mesma ordem do ranking', async () => {
    const cen = await grupoComHistorico(await abrir());
    const r = await anonimo().get(`/api/publico/${cen.grupoA.slug}/pdf`);
    expect(r.status).toBe(200);
    expect(r.headers.get('Cache-Control')).toBe('no-store');
    const pdf = projecaoPdf.parse(r.corpo);
    expect(pdf.mes).toBe('2026-10');
    expect(pdf.geradoEm).toBe('2026-10-22T15:00:00.000Z');
    expect(pdf.urlPublica).toMatch(new RegExp(`/g/${cen.grupoA.slug}$`));
    expect(pdf.colunas.map((c) => [c.data, c.doMesExibido])).toEqual([
      ['2026-07-02', false],
      ['2026-08-06', false],
      ['2026-09-24', false],
      ['2026-10-01', true],
      ['2026-10-08', true],
    ]);
    for (const linha of pdf.linhas) {
      expect(linha.rodadas).toHaveLength(pdf.colunas.length);
      expect(linha.rodadas.reduce((s, x) => s + (x.pontos ?? 0), linha.ptsInicial)).toBe(linha.ptsFinal);
    }
    const ranking = rankingPublico.parse((await anonimo().get(`/api/publico/${cen.grupoA.slug}/ranking`)).corpo);
    expect(pdf.linhas.map((l) => [l.posicao, l.apelido, l.ptsFinal])).toEqual(
      ranking.linhas.map((l) => [l.posicao, l.apelido, l.ptsFinal]),
    );
  });

  it('mês passado sem partidas: as colunas anteriores e "semPartidasNoMes"', async () => {
    const cen = await grupoComHistorico(await abrir());
    const r = await anonimo().get(`/api/publico/${cen.grupoA.slug}/pdf?mes=2026-07`);
    const pdf = projecaoPdf.parse(r.corpo);
    expect(pdf.colunas.map((c) => c.data)).toEqual(['2026-07-02']);
    expect(pdf.semPartidasNoMes).toBe(false);
    const sem = projecaoPdf.parse((await anonimo().get(`/api/publico/${cen.grupoA.slug}/pdf?mes=2026-08`)).corpo);
    expect(sem.colunas.map((c) => c.data)).toEqual(['2026-07-02', '2026-08-06']);
  });

  it('sem nenhuma partida, só o mês de hoje existe e as colunas ficam vazias', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const r = await anonimo().get(`/api/publico/${cen.grupoA.slug}/pdf`);
    expect(r.status).toBe(200);
    expect(projecaoPdf.parse(r.corpo)).toMatchObject({ colunas: [], semPartidasNoMes: true });
  });

  it('slug inexistente, malformado e de grupo arquivado: o mesmo 404 da rota do ranking; mês fora dos limites: 422', async () => {
    const db = await abrir();
    const cen = await grupoComHistorico(db);
    const url = `/api/publico/${cen.grupoA.slug}/pdf`;
    expect((await anonimo().get(`${url}?mes=2026-11`)).status).toBe(422);
    expect((await anonimo().get(`${url}?mes=2026-06`)).status).toBe(422);
    expect((await anonimo().get(`${url}?mes=2026-13`)).status).toBe(422);
    const inexistente = await anonimo().get('/api/publico/nao-existe-xyz/pdf');
    const malformado = await anonimo().get('/api/publico/Maiuscula!/pdf');
    await kyselyDe(db).updateTable('grupos').set({ arquivado_em: AGORA }).where('id', '=', cen.grupoA.id).execute();
    const arquivado = await anonimo().get(url);
    const doRanking = await anonimo().get('/api/publico/nao-existe-xyz/ranking');
    expect([inexistente.status, malformado.status, arquivado.status]).toEqual([404, 404, 404]);
    expect(inexistente.corpo).toEqual(malformado.corpo);
    expect(inexistente.corpo).toEqual(arquivado.corpo);
    expect(inexistente.corpo).toEqual(doRanking.corpo);
  });

  it('nenhum campo pessoal na resposta, nem nas chaves nem no texto', async () => {
    const db = await abrir();
    const cen = await grupoComHistorico(db);
    const r = await anonimo().get(`/api/publico/${cen.grupoA.slug}/pdf`);
    for (const proibida of PROIBIDAS) expect(chaves(r.corpo)).not.toContain(proibida);
    expect(r.texto).not.toContain(cen.grupoA.id);
    expect(r.texto).not.toContain('1985');
  });
});
