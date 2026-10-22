import { periodoPreviaResposta } from '@pelada/contrato';
import { describe, expect, it, vi } from 'vitest';
import { usarDbDoWorker } from '../../../apoio/db-worker.js';
import { usarFabrica } from '../../../apoio/fabrica.js';
import { diaRelativo as d } from '../../../apoio/relogio.js';
import {
  acumulado,
  conferirCoerencia,
  conferirConsumidores,
  conferirOutrosIguais,
  fotografia,
  MESES,
  montarRegressao,
  placar,
  porData,
  type OpcoesRegressao,
  type Regressao,
} from '../../../apoio/regressao-periodos.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);

/** Lê tudo, pede a prévia, aplica a correção por `PUT` e lê tudo de novo. */
async function corrigir(
  opcoes: OpcoesRegressao,
  alvoDoPeriodo: 'entrada' | 'retorno',
  corpo: { saida: string } | { retorno: string },
) {
  const r: Regressao = await montarRegressao(await abrir(), fabrica, opcoes);
  const base = `/api/grupos/${r.g}/jogadores/${r.alvo}/periodos`;
  const antes = await fotografia(r);
  const periodo = antes.periodos[alvoDoPeriodo === 'entrada' ? 0 : 1]!;
  const previaResposta = await r.dono.post(`${base}/${periodo.id}/previa`, corpo);
  expect(previaResposta.status).toBe(200);
  const previa = periodoPreviaResposta.parse(previaResposta.corpo);
  expect((await fotografia(r)).periodos).toEqual(antes.periodos);
  const aplicada = await r.dono.put(`${base}/${periodo.id}`, corpo);
  expect(aplicada.status).toBe(200);
  const depois = await fotografia(r);
  expect(depois.periodos.map((p) => p.id)).toEqual(antes.periodos.map((p) => p.id));
  conferirConsumidores(antes);
  conferirConsumidores(depois);
  conferirCoerencia(antes);
  conferirCoerencia(depois);
  return { r, antes, depois, previa, periodo };
}

// Cada teste monta um grupo com meses de rodadas pela rota; no Windows passa de 5 s.
vi.setConfig({ testTimeout: 30_000 });

describe('correção de período chega a todos os consumidores (workerd)', () => {
  it('retorno antecipado de d(-20) para d(-28) sem presença nas rodadas ganhas: só a grade muda', async () => {
    const { antes, depois, previa } = await corrigir({}, 'retorno', { retorno: d(-28) });
    expect(depois.periodos.map(({ inicio, fim }) => ({ inicio, fim }))).toEqual([
      { inicio: d(-60), fim: d(-45) },
      { inicio: d(-28), fim: null },
    ]);
    expect(placar(depois)).toEqual(placar(antes));
    conferirOutrosIguais(antes, depois);
    const a = porData(antes, 'Alvo');
    const p = porData(depois, 'Alvo');
    for (const data of [d(-26), d(-24)]) {
      expect(a[data]).toEqual({ situacao: 'fora', pontos: null });
      expect(p[data]).toEqual({ situacao: 'falta', pontos: 0 });
    }
    expect({ ...a, [d(-26)]: p[d(-26)], [d(-24)]: p[d(-24)] }).toEqual(p);
    expect(previa).toMatchObject({
      acumuladoAntes: acumulado(antes, 'Alvo').ptsFinal,
      acumuladoDepois: acumulado(depois, 'Alvo').ptsFinal,
      posicaoAntes: acumulado(antes, 'Alvo').posicao,
      posicaoDepois: acumulado(depois, 'Alvo').posicao,
      rodadasQuePassamAConstar: [
        { data: d(-26), situacao: 'falta' },
        { data: d(-24), situacao: 'falta' },
      ],
      rodadasQueDeixamDeConstar: [],
    });
    for (const mes of Object.keys(depois.pdf)) {
      const col = (f: typeof antes) => f.pdf[mes]!.colunas.map((c) => c.data);
      expect(col(depois)).toEqual(col(antes));
    }
  });

  it('presença antiga gravada numa rodada ganha: acumulado, posição e grade já a contavam', async () => {
    const { antes, depois, previa } = await corrigir({ presencaNaGanha: true }, 'retorno', { retorno: d(-28) });
    expect(placar(depois)).toEqual(placar(antes));
    conferirOutrosIguais(antes, depois);
    expect(porData(antes, 'Alvo')[d(-26)]?.situacao).toBe('presente');
    expect(porData(depois, 'Alvo')[d(-26)]?.situacao).toBe('presente');
    expect(previa.acumuladoDepois).toBe(previa.acumuladoAntes);
    expect(previa.acumuladoDepois).toBe(acumulado(depois, 'Alvo').ptsFinal);
    expect(previa.rodadasQuePassamAConstar).toEqual([{ data: d(-24), situacao: 'falta' }]);
  });

  it('lançar a presença do alvo numa rodada ganha muda só os pontos dele', async () => {
    const { r, depois: antes } = await corrigir({}, 'retorno', { retorno: d(-28) });
    const lancada = await r.dono.put(`/api/grupos/${r.g}/partidas/${d(-26)}`, {
      data: d(-26),
      choveu: false,
      marcacoes: [
        { jogadorId: r.alvo, situacao: 'presente' },
        { jogadorId: r.beto, situacao: 'presente' },
        { jogadorId: r.caio, situacao: 'lesionado' },
      ],
    });
    expect(lancada.status).toBe(200);
    const depois = await fotografia(r);
    conferirConsumidores(depois);
    conferirCoerencia(depois);
    conferirOutrosIguais(antes, depois);
    const rodada = porData(depois, 'Alvo')[d(-26)]!;
    expect(rodada.situacao).toBe('presente');
    expect(rodada.pontos).toBeGreaterThan(0);
    expect(acumulado(depois, 'Alvo').ptsFinal - acumulado(antes, 'Alvo').ptsFinal).toBe(rodada.pontos);
    expect({ ...porData(depois, 'Alvo'), [d(-26)]: porData(antes, 'Alvo')[d(-26)] }).toEqual(porData(antes, 'Alvo'));
  });

  it('retorno adiado de d(-20) para d(-18): rodada perdida vira "–" e nenhum ponto muda', async () => {
    const { antes, depois, previa } = await corrigir({}, 'retorno', { retorno: d(-18) });
    expect(placar(depois)).toEqual(placar(antes));
    conferirOutrosIguais(antes, depois);
    expect(porData(antes, 'Alvo')[d(-19)]).toEqual({ situacao: 'falta', pontos: 0 });
    expect(porData(depois, 'Alvo')[d(-19)]).toEqual({ situacao: 'fora', pontos: null });
    expect(previa.rodadasQueDeixamDeConstar).toEqual([{ data: d(-19) }]);
    expect(previa.acumuladoDepois).toBe(previa.acumuladoAntes);
    expect(previa.acumuladoDepois).toBe(acumulado(depois, 'Alvo').ptsFinal);
  });

  it('saída adiada de d(-45) para d(-30): o alvo volta às rodadas cobertas, nos mesmos pontos', async () => {
    const { antes, depois, previa } = await corrigir({}, 'entrada', { saida: d(-30) });
    expect(placar(depois)).toEqual(placar(antes));
    conferirOutrosIguais(antes, depois);
    expect(antes.simulador[d(-40)]).not.toContain('Alvo');
    expect(depois.simulador[d(-40)]).toContain('Alvo');
    expect(antes.nova[d(-38)]).not.toContain('Alvo');
    expect(depois.nova[d(-38)]).toContain('Alvo');
    expect(depois.detalhe[d(-40)]).toContainEqual(['Alvo', 'ausente']);
    expect(porData(depois, 'Alvo')[d(-40)]).toEqual({ situacao: 'falta', pontos: 0 });
    expect(previa.rodadasQuePassamAConstar).toEqual([{ data: d(-40), situacao: 'falta' }]);
    expect(depois.simulador[d(-26)]).not.toContain('Alvo');
  });

  it('histórico importado do legado: lesionado no intervalo "—" não trava nem muda o placar', async () => {
    const { antes, depois } = await corrigir({ lesionadoNoVao: true }, 'retorno', { retorno: d(-28) });
    expect(placar(depois)).toEqual(placar(antes));
    expect(acumulado(depois, 'Alvo')).toEqual(acumulado(antes, 'Alvo'));
    conferirOutrosIguais(antes, depois);
    expect(porData(antes, 'Alvo')[d(-40)]).toEqual(porData(depois, 'Alvo')[d(-40)]);
    expect(depois.detalhe[d(-40)]).toContainEqual(['Alvo', 'lesionado']);
    expect(antes.detalhe[d(-40)]).toContainEqual(['Alvo', 'lesionado']);
  });

  it('reativar com retorno retroativo: as rodadas cobertas aparecem como falta e o acumulado não muda', async () => {
    const r = await montarRegressao(await abrir(), fabrica, { semRetorno: true });
    const antes = await fotografia(r);
    const resposta = await r.dono.post(`/api/grupos/${r.g}/jogadores/${r.alvo}/reativar`, { dataRetorno: d(-28) });
    expect(resposta.status).toBe(200);
    const depois = await fotografia(r);
    for (const foto of [antes, depois]) {
      conferirConsumidores(foto);
      conferirCoerencia(foto);
    }
    expect(depois.periodos.map(({ inicio, fim }) => ({ inicio, fim }))).toEqual([
      { inicio: d(-60), fim: d(-45) },
      { inicio: d(-28), fim: null },
    ]);
    expect(antes.ranking[MESES.at(-1)!]!.linhas.map((l) => l.apelido)).not.toContain('Alvo');
    conferirOutrosIguais(antes, depois);
    expect(acumulado(depois, 'Alvo').ptsFinal).toBe(7 + porData(depois, 'Alvo')[d(-50)]!.pontos!);
    for (const data of [d(-26), d(-24), d(-19), d(-15)]) {
      expect(porData(antes, 'Alvo')[data]).toBeUndefined();
      expect(porData(depois, 'Alvo')[data]).toEqual({ situacao: 'falta', pontos: 0 });
    }
  });
});
