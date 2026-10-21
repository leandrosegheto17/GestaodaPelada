import { env } from 'cloudflare:test';
import { rankingPublico } from '@pelada/contrato';
import { PESOS_PADRAO } from '@pelada/dominio';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { emTransacao } from '../../../src/infraestrutura/db/index.js';
import { kyselyDe } from '../../../src/infraestrutura/db/cliente.js';
import * as grupos from '../../../src/infraestrutura/db/repositorios/grupos.js';
import * as jogadores from '../../../src/infraestrutura/db/repositorios/jogadores.js';
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

const PROIBIDAS = ['telefone', 'anoNascimento', 'idade', 'notas', 'nivel', 'saldo', 'jogadorId', 'email', 'id'];
const VALORES_SEMEADOS = ['1990', '1985', '@', 'telefone'];

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
  for (const [data, presencas] of [
    ['2026-09-24', [{ jogadorId: a, situacao: 'presente' as const }]],
    [
      '2026-10-08',
      [
        { jogadorId: a, situacao: 'presente' as const },
        { jogadorId: b, situacao: 'expulso' as const },
      ],
    ],
  ] as const) {
    await emTransacao(db, (tx) =>
      partidas.criar(tx, g, { data, choveu: false, presencas: [...presencas], autor: cen.adminA.id, agora: AGORA }),
    );
  }
  return cen;
}

const envMutavel: { ENDERECO_NOVO?: string } = env;
const enderecoOriginal = envMutavel.ENDERECO_NOVO;

afterEach(() => {
  vi.restoreAllMocks();
  if (enderecoOriginal === undefined) delete envMutavel.ENDERECO_NOVO;
  else envMutavel.ENDERECO_NOVO = enderecoOriginal;
});

describe('GET /api/publico/:slug/ranking (workerd)', () => {
  it('sem ?mes devolve o mês de hoje, na forma do mockup, sem login e sem cache', async () => {
    const cen = await grupoComHistorico(await abrir());
    const r = await anonimo().get(`/api/publico/${cen.grupoA.slug}/ranking`);
    expect(r.status).toBe(200);
    expect(r.headers.get('Cache-Control')).toBe('no-store');
    const ranking = rankingPublico.parse(r.corpo);
    expect(ranking.mes).toBe('2026-10');
    expect(ranking.hoje).toBe('2026-10-22');
    expect(ranking.grupo.slug).toBe(cen.grupoA.slug);
    expect(ranking.linhas.map((l) => [l.posicao, l.apelido, l.ptsInicial, l.ptsFinal])).toEqual([
      [1, 'Ana', 1, 2],
      [2, 'Beto', 0, -1],
    ]);
    expect(ranking.geradoEm).toBe('2026-10-22T15:00:00.000Z');
    expect(ranking.navegacao).toEqual({ mesAnterior: '2026-09', mesSeguinte: null });
    expect(Object.keys(r.corpo as object).sort()).toEqual(
      ['enderecoNovo', 'geradoEm', 'grupo', 'hoje', 'linhas', 'mes', 'navegacao', 'partidas', 'resumoMes'].sort(),
    );
  });

  it('soma a pontuação inicial ao total e não expõe o campo isolado', async () => {
    const db = await abrir();
    const cen = await grupoComHistorico(db);
    await kyselyDe(db)
      .updateTable('jogadores')
      .set({ pontuacao_inicial: 10 })
      .where('grupo_id', '=', cen.grupoA.id)
      .where('apelido', '=', 'Beto')
      .execute();
    const r = await anonimo().get(`/api/publico/${cen.grupoA.slug}/ranking`);
    const ranking = rankingPublico.parse(r.corpo);
    expect(ranking.linhas.map((l) => [l.posicao, l.apelido, l.ptsInicial, l.ptsFinal])).toEqual([
      [1, 'Beto', 10, 9],
      [2, 'Ana', 1, 2],
    ]);
    expect(chaves(r.corpo).map((k) => k.toLowerCase())).not.toContain('pontuacaoinicial');
  });

  it('enderecoNovo: null sem configuração, URL (sem barra final) com ENDERECO_NOVO', async () => {
    const cen = await grupoComHistorico(await abrir());
    const url = `/api/publico/${cen.grupoA.slug}/ranking`;
    delete envMutavel.ENDERECO_NOVO;
    expect(rankingPublico.parse((await anonimo().get(url)).corpo).enderecoNovo ?? null).toBeNull();
    envMutavel.ENDERECO_NOVO = 'https://novo.exemplo.dev';
    expect(rankingPublico.parse((await anonimo().get(url)).corpo).enderecoNovo).toBe('https://novo.exemplo.dev');
  });

  it('pontos finais de um mês são os iniciais do seguinte', async () => {
    const cen = await grupoComHistorico(await abrir());
    const url = `/api/publico/${cen.grupoA.slug}/ranking`;
    const setembro = rankingPublico.parse((await anonimo().get(`${url}?mes=2026-09`)).corpo);
    const outubro = rankingPublico.parse((await anonimo().get(`${url}?mes=2026-10`)).corpo);
    expect(setembro.mes).toBe('2026-09');
    const finalSetembro = new Map(setembro.linhas.map((l) => [l.apelido, l.ptsFinal]));
    const comuns = outubro.linhas.filter((l) => finalSetembro.has(l.apelido));
    expect(comuns.length).toBeGreaterThan(0);
    for (const l of comuns) expect(l.ptsInicial).toBe(finalSetembro.get(l.apelido));
  });

  it('data de início no meio do histórico: rodada anterior sai "–", sem campo novo, e o final fecha com o inicial', async () => {
    const db = await abrir();
    const cen = await grupoComHistorico(db);
    const ana = (await emTransacao(db, (tx) => jogadores.listar(tx, cen.grupoA.id))).find((j) => j.apelido === 'Ana')!;
    await emTransacao(db, (tx) =>
      jogadores.alterarInicio(tx, cen.grupoA.id, ana.id, { inicio: '2026-10-01', autor: cen.adminA.id, agora: AGORA }),
    );
    const url = `/api/publico/${cen.grupoA.slug}/ranking`;
    const setembro = rankingPublico.parse((await anonimo().get(`${url}?mes=2026-09`)).corpo);
    const outubro = rankingPublico.parse((await anonimo().get(`${url}?mes=2026-10`)).corpo);
    const deAna = (r: typeof setembro) => r.linhas.find((l) => l.apelido === 'Ana')!;
    expect(deAna(setembro).rodadas).toEqual([{ situacao: 'fora', pontos: null }]);
    expect([deAna(setembro).ptsInicial, deAna(setembro).ptsFinal]).toEqual([0, 0]);
    expect(deAna(outubro).rodadas).toEqual([{ situacao: 'presente', pontos: 1 }]);
    expect([deAna(outubro).ptsInicial, deAna(outubro).ptsFinal]).toEqual([0, 1]);
    const finalSetembro = new Map(setembro.linhas.map((l) => [l.apelido, l.ptsFinal]));
    for (const l of outubro.linhas) expect(l.ptsInicial).toBe(finalSetembro.get(l.apelido));
    expect(Object.keys(deAna(outubro)).sort()).toEqual(['apelido', 'posicao', 'ptsFinal', 'ptsInicial', 'rodadas']);
    expect(chaves(outubro).map((k) => k.toLowerCase())).not.toContain('inicio');
  });

  it('?mes malformado: 422; mês fora do histórico: 422', async () => {
    const cen = await grupoComHistorico(await abrir());
    const url = `/api/publico/${cen.grupoA.slug}/ranking`;
    for (const mes of ['abc', '2026-13', '2026-11', '2026-08']) {
      expect((await anonimo().get(`${url}?mes=${mes}`)).status).toBe(422);
    }
  });

  it('slug inexistente, malformado ou arquivado: o mesmo 404 byte a byte; malformado nem consulta', async () => {
    const db = await abrir();
    const cen = await grupoComHistorico(db);
    const espiao = vi.spyOn(grupos, 'buscarPorSlug');
    const malformados = ['a'.repeat(65), '%00', '%20', 'Maiuscula!'];
    const respostas = [];
    for (const slug of malformados) respostas.push(await anonimo().get(`/api/publico/${slug}/ranking`));
    expect(espiao).not.toHaveBeenCalled();
    const inexistente = await anonimo().get('/api/publico/nao-existe-xyz/ranking');
    expect(espiao).toHaveBeenCalledTimes(1);
    await kyselyDe(db).updateTable('grupos').set({ arquivado_em: AGORA }).where('id', '=', cen.grupoA.id).execute();
    const arquivado = await anonimo().get(`/api/publico/${cen.grupoA.slug}/ranking`);
    expect(inexistente.status).toBe(404);
    for (const r of [...respostas, arquivado]) {
      expect(r.status).toBe(404);
      expect(r.texto).toBe(inexistente.texto);
      expect(r.headers.get('Cache-Control')).toBe('no-store');
    }
  });

  it('nenhum campo proibido, por nome ou por valor semeado', async () => {
    const cen = await grupoComHistorico(await abrir());
    const r = await anonimo().get(`/api/publico/${cen.grupoA.slug}/ranking`);
    for (const proibida of PROIBIDAS) expect(chaves(r.corpo)).not.toContain(proibida);
    const texto = r.texto.toLowerCase();
    for (const valor of VALORES_SEMEADOS) expect(texto).not.toContain(valor);
    expect(texto).not.toContain(cen.adminA.id.toLowerCase());
  });

  it('grupo sem partidas: só o mês de hoje, com navegação nula', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    await pesos.criarPadrao(db, cen.grupoB.id, {
      pesos: PESOS_PADRAO,
      vigenteDesde: '2026-01-01',
      registradoPor: cen.adminB.id,
      agora: AGORA,
    });
    const url = `/api/publico/${cen.grupoB.slug}/ranking`;
    const r = await anonimo().get(url);
    expect(rankingPublico.parse(r.corpo).navegacao).toEqual({ mesAnterior: null, mesSeguinte: null });
    expect((await anonimo().get(`${url}?mes=2026-09`)).status).toBe(422);
  });
});
