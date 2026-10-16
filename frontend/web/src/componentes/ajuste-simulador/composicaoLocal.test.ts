import { avaliarCorpo } from '@pelada/contrato';
import { describe, expect, it } from 'vitest';
import { sugestaoDoisDeTeste, sugestaoVariosDeTeste } from './apoio-teste';
import {
  definirSo1oTempo,
  deSugestao,
  destinoAtual,
  infoDosJogadores,
  mover,
  paraCorpoAvaliar,
  paraExibicao,
  trocar,
  type ComposicaoDois,
  type ComposicaoLocal,
} from './composicaoLocal';

const dois = sugestaoDoisDeTeste();
const varios = sugestaoVariosDeTeste();
const id = (mapa: Map<string, string>, chave: string) => mapa.get(chave)!;

function ids(comp: ComposicaoLocal): string[] {
  return comp.formato === 'varios_times'
    ? comp.times.flat()
    : [...comp.times.flatMap((t) => [...t.titulares, ...t.entram]), ...comp.naoEntra];
}

describe('composição de 2 times', () => {
  const inicial = deSugestao(dois.sugestao, dois.entrada) as ComposicaoDois;
  const japa = id(dois.ids, 'j-japa');

  it('parte da sugestão: Japa entra pelo Time A e Juninho é "só 1º tempo"', () => {
    expect(destinoAtual(inicial, japa)).toEqual({ lugar: 'entra', time: 0 });
    expect(inicial.so1oTempo.has(id(dois.ids, 'j-juninho'))).toBe(true);
  });

  it('mover Japa para titular do Time B e para "não entra"', () => {
    const titularB = mover(inicial, japa, { lugar: 'titular', time: 1 });
    expect(destinoAtual(titularB, japa)).toEqual({ lugar: 'titular', time: 1 });
    expect(destinoAtual(mover(inicial, japa, { lugar: 'naoEntra' }), japa)).toEqual({ lugar: 'naoEntra' });
    expect(ids(titularB).sort()).toEqual(ids(inicial).sort());
  });

  it('trocar entre times e dentro do mesmo time', () => {
    const toninho = id(dois.ids, 'j-toninho');
    const bigode = id(dois.ids, 'j-bigode');
    const trocada = trocar(inicial, toninho, bigode);
    expect(destinoAtual(trocada, toninho)).toEqual({ lugar: 'titular', time: 1 });
    expect(destinoAtual(trocada, bigode)).toEqual({ lugar: 'titular', time: 0 });
    const cabeca = id(dois.ids, 'j-cabeca');
    const dentro = trocar(inicial, cabeca, japa);
    expect(destinoAtual(dentro, cabeca)).toEqual({ lugar: 'entra', time: 0 });
    expect(dentro.formato === 'dois_times' && dentro.times[0].entram).toEqual([japa, cabeca]);
  });

  it('só 1º tempo liga e desliga', () => {
    const ligado = definirSo1oTempo(inicial, japa, true) as ComposicaoDois;
    expect(ligado.so1oTempo.has(japa)).toBe(true);
    expect((definirSo1oTempo(ligado, japa, false) as ComposicaoDois).so1oTempo.has(japa)).toBe(false);
  });

  it('destino de outro formato não muda nada', () => {
    expect(mover(inicial, japa, { time: 2 })).toBe(inicial);
  });

  it('o corpo de avaliar passa no schema do contrato', () => {
    const corpo = paraCorpoAvaliar(dois.entrada, mover(inicial, japa, { lugar: 'titular', time: 1 }));
    expect(corpo).not.toBeNull();
    expect(avaliarCorpo.safeParse(corpo).success).toBe(true);
  });

  it('nenhum id duplicado ou perdido após uma sequência de ajustes', () => {
    const todos = ids(inicial);
    let comp: ComposicaoLocal = inicial;
    for (let i = 0; i < 60; i += 1) {
      const quem = todos[(i * 7) % todos.length]!;
      const outro = todos[(i * 11 + 3) % todos.length]!;
      comp =
        i % 3 === 0
          ? mover(comp, quem, { lugar: i % 2 ? 'titular' : 'entra', time: i % 2 === 0 ? 0 : 1 })
          : i % 3 === 1
            ? trocar(comp, quem, outro)
            : mover(comp, quem, { lugar: 'naoEntra' });
      expect(ids(comp).sort()).toEqual([...todos].sort());
    }
  });

  it('a exibição mostra a posição nova e mantém os números da última resposta', () => {
    const movida = mover(inicial, japa, { lugar: 'titular', time: 1 });
    const exibicao = paraExibicao(movida, infoDosJogadores(dois.sugestao), dois.sugestao, dois.entrada.n);
    if (exibicao.formato !== 'dois_times') throw new Error('esperava dois times');
    expect(exibicao.times[1].titulares.some((j) => j.id === japa && j.apelido === 'Japa')).toBe(true);
    expect(exibicao.times[0].entramNo2oTempo.some((j) => j.id === japa)).toBe(false);
    expect(exibicao.times[0].indicadores).toEqual(dois.sugestao.times[0].indicadores);
  });
});

describe('composição de 3 ou mais times', () => {
  const inicial = deSugestao(varios.sugestao, varios.entrada);
  const toninho = id(varios.ids, 'j-toninho');

  it('mover para o Time 2 e trocar entre times', () => {
    const movida = mover(inicial, toninho, { time: 1 });
    expect(destinoAtual(movida, toninho)).toEqual({ time: 1 });
    expect(ids(movida).sort()).toEqual(ids(inicial).sort());
    const bigode = id(varios.ids, 'j-bigode');
    const trocada = trocar(inicial, toninho, bigode);
    expect(destinoAtual(trocada, toninho)).toEqual({ time: 1 });
    expect(destinoAtual(trocada, bigode)).toEqual({ time: 0 });
  });

  it('destino fora dos times ou de 2 times não muda nada', () => {
    expect(mover(inicial, toninho, { time: 9 })).toBe(inicial);
    expect(mover(inicial, toninho, { lugar: 'naoEntra' })).toBe(inicial);
  });

  it('o corpo de avaliar vale e a exibição marca como incompleto quem ficou abaixo de N', () => {
    expect(paraCorpoAvaliar(varios.entrada, inicial)).not.toBeNull();
    const ze = id(varios.ids, 'j-ze');
    const movida = mover(inicial, ze, { time: 0 });
    const exibicao = paraExibicao(movida, infoDosJogadores(varios.sugestao), varios.sugestao, varios.entrada.n);
    if (exibicao.formato !== 'varios_times') throw new Error('esperava vários times');
    expect(exibicao.times.map((t) => t.incompleto)).toEqual([false, false, false, false, true]);
    expect(exibicao.times[0]?.jogadores).toHaveLength(5);
  });
});
