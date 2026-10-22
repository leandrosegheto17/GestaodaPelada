import { describe, expect, it } from 'vitest';
import {
  paraConfigPesosDominio,
  paraJogadorDominio,
  paraPartidaDominio,
  paraPresencaDominio,
} from '../../../src/aplicacao/pontuacao/adaptadores.js';

describe('adaptadores do histórico', () => {
  it('jogador: copia só os campos do domínio, sem telefone, e preserva período aberto', () => {
    const r = paraJogadorDominio({
      id: 'j1',
      apelido: 'Toninho',
      anoNascimento: 1978,
      posicao: 'atacante',
      telefone: '11987654321',
      pontuacaoInicial: 40,
      inicioPontuacao: null,
      periodos: [{ id: 'p1', inicio: '2026-02-05', fim: null }],
    });
    expect(r).toEqual({
      id: 'j1',
      apelido: 'Toninho',
      anoNascimento: 1978,
      periodos: [{ inicio: '2026-02-05', fim: null }],
      pontuacaoInicial: 40,
      inicioPontuacao: '2026-02-05',
    });
    expect(JSON.stringify(r)).not.toContain('11987654321');
  });

  it('ano de nascimento anonimizado vai para o fim do desempate', () => {
    const r = paraJogadorDominio({
      id: 'j',
      apelido: 'x',
      anoNascimento: null,
      posicao: null,
      telefone: null,
      pontuacaoInicial: 0,
      inicioPontuacao: null,
      periodos: [],
    });
    expect(r.anoNascimento).toBe(9999);
    expect(r.inicioPontuacao).toBeUndefined();
  });

  it('data de início gravada vale sobre o início do primeiro período', () => {
    const base = { id: 'j', apelido: 'x', anoNascimento: 1990, posicao: null, telefone: null, pontuacaoInicial: 0 };
    const periodos = [
      { id: 'p1', inicio: '2026-10-20', fim: null },
      { id: 'p2', inicio: '2026-12-01', fim: null },
    ];
    expect(paraJogadorDominio({ ...base, inicioPontuacao: '2026-09-20', periodos }).inicioPontuacao).toBe('2026-09-20');
    expect(paraJogadorDominio({ ...base, inicioPontuacao: null, periodos }).inicioPontuacao).toBe('2026-10-20');
  });

  it('partida e presença mantêm datas e situação; situação desconhecida falha', () => {
    expect(paraPartidaDominio({ id: 'p', data: '2026-10-15', choveu: true })).toEqual({
      id: 'p',
      data: '2026-10-15',
      choveu: true,
    });
    expect(paraPresencaDominio({ partidaId: 'p', jogadorId: 'j', situacao: 'expulso' })).toEqual({
      partidaId: 'p',
      jogadorId: 'j',
      situacao: 'expulso',
    });
    expect(() => paraPresencaDominio({ partidaId: 'p', jogadorId: 'j', situacao: 'ausente' })).toThrow();
  });

  it('config de pesos: nomes do domínio, registradoEm em ISO e sem o nome de quem registrou', () => {
    const r = paraConfigPesosDominio({
      vigenteDesde: '2026-09-01',
      vigenteAte: null,
      registradoPor: 'Leandro',
      registradoEm: new Date('2026-08-30T10:00:00Z'),
      presencaSemChuva: 1,
      presencaComChuva: 2,
      lesionadoSemChuva: 1,
      lesionadoComChuva: 1,
      expulsoSemChuva: -1,
      expulsoComChuva: -2,
    });
    expect(r).toEqual({
      vigenteDesde: '2026-09-01',
      registradoEm: '2026-08-30T10:00:00.000Z',
      presencaSemChuva: 1,
      presencaComChuva: 2,
      lesionadoSemChuva: 1,
      lesionadoComChuva: 1,
      expulsoSemChuva: -1,
      expulsoComChuva: -2,
    });
  });
});
