import {
  contextoSimulador,
  mesFinanceiro,
  partidaDetalhe,
  partidaNova,
  periodosResposta,
  projecaoPdf,
  rankingPublico,
} from '@pelada/contrato';
import { PESOS_PADRAO } from '@pelada/dominio';
import { expect } from 'vitest';
import type { Db } from '../../src/infraestrutura/db/index.js';
import * as jogadoresRepo from '../../src/infraestrutura/db/repositorios/jogadores.js';
import * as pesos from '../../src/infraestrutura/db/repositorios/pesos.js';
import { montarCenario } from './cenario-acesso.js';
import { clienteTeste } from './cliente.js';
import { criarConfig } from './fabricas/financeiro.js';
import { criarJogador } from './fabricas/jogadores.js';
import { criarPartida } from './fabricas/partidas.js';
import type { Fabrica } from './fabrica.js';
import { AGORA_TESTE, diaRelativo as d, HOJE_TESTE, relogioFixo } from './relogio.js';

/** Datas do histórico, todas relativas a "hoje". */
export const PARTIDAS = [d(-50), d(-40), d(-26), d(-24), d(-19), d(-15)] as const;
export const SEM_PARTIDA = [d(-38), d(-27), d(-22), d(-20)] as const;

export interface OpcoesRegressao {
  /** Presença do alvo gravada numa rodada que um período corrigido passa a cobrir. */
  presencaNaGanha?: boolean;
  /** Lesionado do alvo dentro do intervalo "—" (histórico importado do legado). */
  lesionadoNoVao?: boolean;
  /** O alvo continua inativo desde a saída (sem retorno) e sem presença depois dela. */
  semRetorno?: boolean;
}

/**
 * Grupo com três jogadores e seis rodadas. O alvo entra em d(-60), sai em d(-45) e volta em
 * d(-20); Beto e Caio ficam ativos o tempo todo.
 */
export async function montarRegressao(db: Db, fabrica: Fabrica, opcoes: OpcoesRegressao = {}) {
  const cen = await montarCenario(db, fabrica);
  const g = cen.grupoA.id;
  const autor = cen.adminA.id;
  await pesos.criarPadrao(db, g, {
    pesos: PESOS_PADRAO,
    vigenteDesde: d(-400),
    registradoPor: autor,
    agora: AGORA_TESTE,
  });
  await criarConfig(db, g, { mensalidadeCentavos: 7_500, saldoInicialCentavos: 0, dataSaldoInicial: d(-50) });
  const alvo = await criarJogador(db, g, autor, { apelido: 'Alvo', dataEntrada: d(-60), pontuacaoInicial: 7 });
  const beto = await criarJogador(db, g, autor, { apelido: 'Beto', dataEntrada: d(-80), pontuacaoInicial: 3 });
  const caio = await criarJogador(db, g, autor, { apelido: 'Caio', dataEntrada: d(-80) });
  await jogadoresRepo.inativar(db, g, alvo, d(-45));
  if (!opcoes.semRetorno) await jogadoresRepo.reativar(db, g, alvo, d(-20));

  const presente = (jogadorId: string) => ({ jogadorId, situacao: 'presente' as const });
  const rodadas: Array<[string, Array<{ jogadorId: string; situacao: 'presente' | 'lesionado' | 'expulso' }>]> = [
    [d(-50), [presente(alvo), presente(beto), { jogadorId: caio, situacao: 'expulso' }]],
    [
      d(-40),
      [
        presente(beto),
        presente(caio),
        ...(opcoes.lesionadoNoVao ? [{ jogadorId: alvo, situacao: 'lesionado' as const }] : []),
      ],
    ],
    [
      d(-26),
      [presente(beto), { jogadorId: caio, situacao: 'lesionado' }, ...(opcoes.presencaNaGanha ? [presente(alvo)] : [])],
    ],
    [d(-24), [presente(beto), presente(caio)]],
    [d(-19), [presente(beto)]],
    [
      d(-15),
      [...(opcoes.semRetorno ? [] : [presente(alvo)]), presente(beto), { jogadorId: caio, situacao: 'expulso' }],
    ],
  ];
  for (const [data, presencas] of rodadas) await criarPartida(db, g, data, autor, { presencas });

  const dono = clienteTeste({ relogio: relogioFixo(HOJE_TESTE), cookie: cen.adminA.cookie });
  const publico = clienteTeste({ relogio: relogioFixo(HOJE_TESTE) });
  return { cen, g, alvo, beto, caio, dono, publico, slug: cen.grupoA.slug };
}
export type Regressao = Awaited<ReturnType<typeof montarRegressao>>;

const mesDe = (data: string) => data.slice(0, 7);
function mesesDoHistorico(): string[] {
  const meses: string[] = [];
  const cursor = new Date(`${mesDe(d(-50))}-01T00:00:00Z`);
  while (mesDe(cursor.toISOString().slice(0, 10)) <= mesDe(HOJE_TESTE)) {
    meses.push(mesDe(cursor.toISOString().slice(0, 10)));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return meses;
}
export const MESES = mesesDoHistorico();

interface Intervalo {
  inicio: string;
  fim: string | null;
}
/** Dia ativo: do início inclusive até a saída exclusive. */
export const ativoEm = (periodos: Intervalo[], data: string) =>
  periodos.some((p) => p.inicio <= data && (p.fim === null || data < p.fim));
const ativoNoMes = (periodos: Intervalo[], mes: string) =>
  periodos.some((p) => p.inicio <= `${mes}-31` && (p.fim === null || p.fim > `${mes}-01`));

/** Tudo o que cada consumidor devolve no carregamento, lido pelas rotas reais. */
export async function fotografia(r: Regressao) {
  const base = `/api/grupos/${r.g}`;
  const lido = async <T>(cliente: typeof r.dono, caminho: string, esquema: { parse: (v: unknown) => T }) => {
    const resposta = await cliente.get(caminho);
    expect(resposta.status, caminho).toBe(200);
    return { dado: esquema.parse(resposta.corpo), texto: resposta.texto };
  };
  const ranking: Record<string, ReturnType<typeof rankingPublico.parse>> = {};
  const pdf: Record<string, ReturnType<typeof projecaoPdf.parse>> = {};
  const financeiro: Record<string, string[]> = {};
  const textosPublicos: string[] = [];
  for (const mes of MESES) {
    const rk = await lido(r.publico, `/api/publico/${r.slug}/ranking?mes=${mes}`, rankingPublico);
    const pd = await lido(r.publico, `/api/publico/${r.slug}/pdf?mes=${mes}`, projecaoPdf);
    ranking[mes] = rk.dado;
    pdf[mes] = pd.dado;
    textosPublicos.push(rk.texto, pd.texto);
    const fin = await lido(r.dono, `${base}/financeiro/mes?mes=${mes}`, mesFinanceiro);
    financeiro[mes] = fin.dado.pagamentos.map((p) => p.apelido);
  }
  const simulador: Record<string, string[]> = {};
  for (const data of [...PARTIDAS, ...SEM_PARTIDA]) {
    const c = await lido(r.dono, `${base}/simulador/contexto?data=${data}`, contextoSimulador);
    simulador[data] = c.dado.jogadores.map((j) => j.apelido);
  }
  const nova: Record<string, string[]> = {};
  for (const data of SEM_PARTIDA) {
    const n = await lido(r.dono, `${base}/partidas/nova?data=${data}`, partidaNova);
    nova[data] = n.dado.jogadores.map((j) => j.apelido);
  }
  const detalhe: Record<string, Array<[string, string]>> = {};
  for (const data of PARTIDAS) {
    const p = await lido(r.dono, `${base}/partidas/${data}`, partidaDetalhe);
    detalhe[data] = p.dado.jogadores.map((j) => [j.apelido, j.situacao]);
  }
  const periodos = (await lido(r.dono, `${base}/jogadores/${r.alvo}/periodos`, periodosResposta)).dado.periodos;
  return { ranking, pdf, financeiro, simulador, nova, detalhe, periodos, textosPublicos };
}
export type Foto = Awaited<ReturnType<typeof fotografia>>;

/** Posição, PTS INICIAL e PTS FINAL de todos os jogadores, mês a mês. */
export const placar = (f: Foto, semFinalDe: string[] = []) =>
  MESES.map((mes) =>
    f.ranking[mes]!.linhas.map((l) => [
      l.posicao,
      l.apelido,
      l.ptsInicial,
      semFinalDe.includes(l.apelido) ? null : l.ptsFinal,
    ]),
  );

/** Situação e pontos de um jogador por data de rodada, juntando todos os meses. */
export function porData(f: Foto, apelido: string) {
  const mapa: Record<string, { situacao: string; pontos: number | null }> = {};
  for (const mes of MESES) {
    const ranking = f.ranking[mes]!;
    const linha = ranking.linhas.find((l) => l.apelido === apelido);
    ranking.partidas.forEach((p, i) => {
      if (linha?.rodadas[i]) mapa[p.data] = linha.rodadas[i];
    });
  }
  return mapa;
}

/** Pontos finais do mês corrente de um jogador (o acumulado que a prévia mostra). */
export const acumulado = (f: Foto, apelido: string) =>
  f.ranking[mesDe(HOJE_TESTE)]!.linhas.find((l) => l.apelido === apelido)!;

/**
 * PDF e ranking contam a mesma história; o PTS FINAL de um mês é o PTS INICIAL do seguinte, salvo no mês
 * em que o alvo volta ao grupo: o retorno zera a contagem (começa em 0, sem a pontuação inicial).
 */
export function conferirCoerencia(f: Foto) {
  const retornos = f.periodos.slice(1).map((p) => mesDe(p.inicio));
  MESES.slice(1).forEach((mes, i) => {
    const anterior = new Map(f.ranking[MESES[i]!]!.linhas.map((l) => [l.apelido, l.ptsFinal]));
    for (const l of f.ranking[mes]!.linhas) {
      const reinicio = l.apelido === 'Alvo' && retornos.includes(mes);
      expect(l.ptsInicial, `${l.apelido} ${mes}`).toBe(reinicio ? 0 : anterior.get(l.apelido));
    }
  });
  for (const mes of MESES) {
    const pdf = f.pdf[mes]!;
    expect(pdf.linhas.map((l) => [l.posicao, l.apelido, l.ptsFinal])).toEqual(
      f.ranking[mes]!.linhas.map((l) => [l.posicao, l.apelido, l.ptsFinal]),
    );
    for (const l of pdf.linhas) {
      expect(
        l.rodadas.reduce((s, x) => s + (x.pontos ?? 0), l.ptsInicial),
        `PDF ${l.apelido} ${mes}`,
      ).toBe(l.ptsFinal);
    }
  }
  for (const texto of f.textosPublicos) expect(texto).not.toMatch(/auditoria|acumuladoAntes|posicaoAntes/);
}

/** Cada consumidor lista o alvo exatamente nos dias e meses em que os períodos dizem que ele está ativo. */
export function conferirConsumidores(f: Foto) {
  const intervalos = f.periodos.map(({ inicio, fim }) => ({ inicio, fim }));
  for (const data of [...PARTIDAS, ...SEM_PARTIDA]) {
    expect(f.simulador[data]?.includes('Alvo'), `simulador ${data}`).toBe(ativoEm(intervalos, data));
  }
  for (const data of SEM_PARTIDA) {
    expect(f.nova[data]?.includes('Alvo'), `nova ${data}`).toBe(ativoEm(intervalos, data));
  }
  for (const mes of MESES) {
    expect(f.financeiro[mes]?.includes('Alvo'), `financeiro ${mes}`).toBe(ativoNoMes(intervalos, mes));
  }
  for (const [data, linhas] of Object.entries(f.detalhe)) {
    const comPresenca = linhas.some(([apelido, situacao]) => apelido === 'Alvo' && situacao !== 'ausente');
    const listado = linhas.some(([apelido]) => apelido === 'Alvo');
    expect(listado, `partidas/${data}`).toBe(ativoEm(intervalos, data) || comPresenca);
  }
}

/** Tudo igual entre as duas fotos, menos o que é do alvo (Beto e Caio nunca mudam). */
export function conferirOutrosIguais(antes: Foto, depois: Foto) {
  for (const apelido of ['Beto', 'Caio']) {
    expect(porData(depois, apelido), apelido).toEqual(porData(antes, apelido));
    expect(acumulado(depois, apelido).ptsFinal).toBe(acumulado(antes, apelido).ptsFinal);
  }
}
