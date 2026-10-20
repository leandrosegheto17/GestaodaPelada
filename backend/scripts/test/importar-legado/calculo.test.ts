import { describe, expect, it } from 'vitest';
import { calcularPlano, PESOS_LEGADO, VIGENCIA_LEGADO } from '../../importar-legado/calculo.ts';
import { lerCadastro } from '../../importar-legado/leitura-cadastro.ts';
import { lerPontuacoes } from '../../importar-legado/leitura-pontuacoes.ts';
import { contarPlano, linhasDeConferencia, linhasDeContagens } from '../../importar-legado/relatorio.ts';
import { ErroLegado } from '../../importar-legado/tipos.ts';
import {
  ATLETAS,
  atualDe,
  HOJE_DAS_FIXTURES,
  montarCadastro,
  montarPontuacoes,
  pontosDeRodadas,
  type AtletaFicticio,
} from './fixtures.ts';

function planoDe(atletas: readonly AtletaFicticio[] = ATLETAS) {
  return calcularPlano(
    lerPontuacoes(montarPontuacoes(atletas), HOJE_DAS_FIXTURES),
    lerCadastro(montarCadastro(atletas), HOJE_DAS_FIXTURES),
    HOJE_DAS_FIXTURES,
  );
}

const plano = planoDe();
const jogador = (apelido: string) => plano.jogadores.find((j) => j.apelido === apelido)!;

describe('cálculo do plano de importação', () => {
  it('pesos do legado: presença 3/6, lesionado 3/6, expulso 2/5, vigentes desde 03/04/2022', () => {
    expect(PESOS_LEGADO).toEqual({
      presencaSemChuva: 3,
      presencaComChuva: 6,
      lesionadoSemChuva: 3,
      lesionadoComChuva: 6,
      expulsoSemChuva: 2,
      expulsoComChuva: 5,
    });
    expect(VIGENCIA_LEGADO).toBe('2022-04-03');
  });

  it('3 e 6 são presença, 2 e 5 são expulso, 0 e "—" não geram presença', () => {
    const quartaRodada = plano.partidas.find((p) => p.data === '2022-04-24')!;
    expect(quartaRodada.presencas).toContainEqual({ apelido: 'Bravo', situacao: 'expulso' });
    expect(quartaRodada.presencas).toContainEqual({ apelido: 'Alfa', situacao: 'presente' });
    const segunda = plano.partidas.find((p) => p.data === '2022-04-10')!;
    expect(segunda.presencas.map((p) => p.apelido)).toEqual(['Alfa', 'Eco', 'Foxtrot']);
    expect(plano.partidas.flatMap((p) => p.presencas).every((p) => p.situacao !== ('lesionado' as string))).toBe(true);
  });

  it('"Choveu" quando há valor em dobro', () => {
    expect(plano.partidas.map((p) => [p.data, p.choveu])).toEqual([
      ['2022-04-03', false],
      ['2022-04-10', false],
      ['2022-04-17', true],
      ['2022-04-24', false],
      ['2022-05-01', false],
      ['2022-05-08', false],
    ]);
  });

  it('entrada = 1ª rodada com número; saída (só inativos) = dia seguinte à última rodada com número', () => {
    expect(jogador('Alfa')).toMatchObject({ entrada: '2022-04-03', saida: null });
    expect(jogador('Delta')).toMatchObject({ entrada: '2022-04-17', saida: null });
    expect(jogador('Foxtrot')).toMatchObject({ entrada: '2022-04-03', saida: '2022-04-25' });
  });

  it('ativo sem nenhuma rodada entra no dia da importação', () => {
    expect(jogador('Golf')).toMatchObject({ entrada: HOJE_DAS_FIXTURES, saida: null, pontuacaoInicial: 0 });
  });

  it('inativo sem cadastro recebe ano 1970 e posição Meia; ativo usa o cadastro; só ativos têm notas', () => {
    expect(jogador('Foxtrot')).toMatchObject({ anoNascimento: 1970, posicao: 'meia', notas: null, ativo: false });
    expect(jogador('Alfa')).toMatchObject({ anoNascimento: 1980, posicao: 'meia', notas: [8, 7, 6, 7, 8, 5] });
    expect(plano.jogadores.filter((j) => j.notas !== null)).toHaveLength(6);
  });

  it('"—" no meio do histórico: sem presença, sem período extra, e o jogador entra na contagem de lacunas', () => {
    expect(plano.comLacuna).toBe(1);
    expect(jogador('Charlie')).toMatchObject({ entrada: '2022-04-03', saida: null });
    const segunda = plano.partidas.find((p) => p.data === '2022-04-10')!;
    expect(segunda.presencas.some((p) => p.apelido === 'Charlie')).toBe(false);
  });

  it('propriedade: o total calculado de todo jogador = inicial + soma das rodadas', () => {
    for (const atleta of ATLETAS) {
      const c = plano.conferencia.find((x) => x.apelido === atleta.apelido)!;
      expect(c.calculado).toBe(atleta.inicial + pontosDeRodadas(atleta));
      expect(c.atual).toBe(atualDe(atleta));
    }
  });

  it('a diferença para o "Atual" é o ajuste: confere em todos; "esperada" só para quem tem ajuste', () => {
    expect(plano.conferencia.every((c) => c.confere)).toBe(true);
    const eco = plano.conferencia.find((c) => c.apelido === 'Eco')!;
    expect(eco).toMatchObject({ calculado: 25, atual: 28, ajustes: 3, diferenca: 3, confere: true });
    expect(linhasDeConferencia(plano)).toEqual([
      expect.stringContaining('diferença esperada: Eco calculado 25 × Atual 28'),
    ]);
  });

  it('diferença diferente do ajuste é divergência', () => {
    const alterado = ATLETAS.map((a) => (a.apelido === 'Alfa' ? { ...a, inicial: a.inicial + 1 } : a));
    const texto = montarPontuacoes(alterado).replace('| Alfa | ativo | 31 |', '| Alfa | ativo | 30 |');
    const divergente = calcularPlano(
      lerPontuacoes(texto, HOJE_DAS_FIXTURES),
      lerCadastro(montarCadastro(alterado), HOJE_DAS_FIXTURES),
      HOJE_DAS_FIXTURES,
    );
    const alfa = divergente.conferencia.find((c) => c.apelido === 'Alfa')!;
    expect(alfa.confere).toBe(false);
    expect(linhasDeConferencia(divergente).some((l) => l.startsWith('DIVERGÊNCIA: Alfa'))).toBe(true);
    expect(contarPlano(divergente).divergencias).toBe(1);
  });

  it('as contagens do relatório batem com o plano e não trazem apelido', () => {
    const c = contarPlano(plano);
    expect(c).toEqual({
      jogadores: 7,
      ativos: 6,
      inativos: 1,
      partidas: 6,
      comChuva: 1,
      presencas: plano.partidas.reduce((s, p) => s + p.presencas.length, 0),
      notas: 36,
      rodadasMistas: 0,
      jogadoresComLacuna: 1,
      diferencasEsperadas: 1,
      divergencias: 0,
    });
    const texto = linhasDeContagens(c).join('\n');
    for (const a of ATLETAS) expect(texto).not.toContain(a.apelido);
  });
});

describe('arquivos inconsistentes', () => {
  const lerTexto = (pontuacoes: string, cadastro: string) =>
    calcularPlano(
      lerPontuacoes(pontuacoes, HOJE_DAS_FIXTURES),
      lerCadastro(cadastro, HOJE_DAS_FIXTURES),
      HOJE_DAS_FIXTURES,
    );

  it('rodada com valor simples e em dobro: chuva pela maioria, contada como mista, e quem destoa diverge', () => {
    const mista = montarPontuacoes([{ ...ATLETAS[0]!, rodadas: [3, 3, 3, 3, 3, 3] }, ...ATLETAS.slice(1)]);
    const lido = calcularPlano(
      lerPontuacoes(mista, HOJE_DAS_FIXTURES),
      lerCadastro(montarCadastro(), HOJE_DAS_FIXTURES),
      HOJE_DAS_FIXTURES,
    );
    expect(lido.partidas.find((p) => p.data === '2022-04-17')).toMatchObject({ choveu: true, mista: true });
    expect(contarPlano(lido).rodadasMistas).toBe(1);
    expect(lido.conferencia.find((c) => c.apelido === 'Alfa')).toMatchObject({ confere: false, diferenca: -3 });
    expect(lido.conferencia.filter((c) => !c.confere)).toHaveLength(1);
  });

  it('atleta da classificação sem cadastro é recusado', () => {
    const semFoxtrot = montarCadastro().replace('\n| Foxtrot | — | 11 |', '');
    expect(semFoxtrot).not.toContain('Foxtrot');
    expect(() => lerTexto(montarPontuacoes(), semFoxtrot)).toThrow(ErroLegado);
  });

  it('atleta do cadastro fora da classificação é recusado', () => {
    const extra = [
      ...ATLETAS,
      { apelido: 'Hotel', ativo: false, inicial: 0, rodadas: [0, 0, 0, 0, undefined, undefined] },
    ];
    expect(() => lerTexto(montarPontuacoes(), montarCadastro(extra))).toThrow(ErroLegado);
  });

  it('atleta de rodada fora da classificação é recusado', () => {
    const linhaDeAlfa = '| Alfa | 3 | 3 | 6 | 3 | 15 | 0 |';
    const pontuacoes = montarPontuacoes().replace(linhaDeAlfa, `${linhaDeAlfa}\n| India | 0 | 0 | 0 | 0 | 0 | 0 |`);
    expect(pontuacoes).toContain('India');
    expect(() => lerTexto(pontuacoes, montarCadastro())).toThrow(/fora da classificação/);
  });

  it('inativo sem nenhuma rodada é recusado', () => {
    const vazio = [
      ...ATLETAS,
      {
        apelido: 'Juliet',
        ativo: false,
        inicial: 4,
        rodadas: [undefined, undefined, undefined, undefined, undefined, undefined],
      },
    ];
    expect(() => lerTexto(montarPontuacoes(vazio), montarCadastro(vazio))).toThrow(/inativo sem nenhuma rodada/);
  });

  it('rodada anterior à vigência dos pesos do legado é recusada', () => {
    const antigo = montarPontuacoes().replaceAll('03/04', '02/04');
    expect(() => lerTexto(antigo, montarCadastro())).toThrow(/vigência/);
  });
});
