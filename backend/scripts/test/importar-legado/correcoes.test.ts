import { describe, expect, it } from 'vitest';
import { calcularPlano } from '../../importar-legado/calculo.ts';
import { lerCorrecoes, type Correcoes } from '../../importar-legado/correcoes.ts';
import { lerCadastro } from '../../importar-legado/leitura-cadastro.ts';
import { lerPontuacoes } from '../../importar-legado/leitura-pontuacoes.ts';
import {
  contarPlano,
  linhasDeConferencia,
  linhasDeContagens,
  linhasDeCorrecoes,
} from '../../importar-legado/relatorio.ts';
import { ErroLegado } from '../../importar-legado/tipos.ts';
import { ATLETAS, HOJE_DAS_FIXTURES, montarCadastro, montarPontuacoes } from './fixtures.ts';

const plano = (correcoes?: Correcoes) =>
  calcularPlano(
    lerPontuacoes(montarPontuacoes(), HOJE_DAS_FIXTURES),
    lerCadastro(montarCadastro(), HOJE_DAS_FIXTURES),
    HOJE_DAS_FIXTURES,
    correcoes,
  );
const conferenciaDe = (p: ReturnType<typeof plano>, apelido: string) =>
  p.conferencia.find((c) => c.apelido === apelido)!;

describe('leitura do JSON de correções', () => {
  it('aceita o formato documentado', () => {
    const texto = '{"chuva":["2022-04-24"],"presencas":[{"data":"2022-04-10","atleta":"Alfa","situacao":"presente"}]}';
    expect(lerCorrecoes(texto)).toEqual({
      chuva: ['2022-04-24'],
      presencas: [{ data: '2022-04-10', atleta: 'Alfa', situacao: 'presente' }],
    });
    expect(lerCorrecoes('{}')).toEqual({ chuva: [], presencas: [] });
  });

  it.each([
    ['não é JSON', 'isto-nao-e-json-segredo'],
    ['raiz não é objeto', '[]'],
    ['campo desconhecido', '{"outro":1}'],
    ['chuva não é lista', '{"chuva":"2022-04-24"}'],
    ['data de chuva inválida', '{"chuva":["24/04/2022"]}'],
    ['data inexistente no calendário', '{"chuva":["2022-02-30"]}'],
    ['chuva repetida', '{"chuva":["2022-04-24","2022-04-24"]}'],
    ['situação inválida', '{"presencas":[{"data":"2022-04-10","atleta":"Segredo","situacao":"x"}]}'],
    ['atleta vazio', '{"presencas":[{"data":"2022-04-10","atleta":" ","situacao":"presente"}]}'],
    ['campo extra na presença', '{"presencas":[{"data":"2022-04-10","atleta":"Segredo","situacao":"presente","a":1}]}'],
  ])('recusa %s sem repetir o conteúdo', (_nome, texto) => {
    try {
      lerCorrecoes(texto);
    } catch (erro) {
      expect(erro).toBeInstanceOf(ErroLegado);
      expect((erro as Error).message).not.toMatch(/segredo/i);
      return;
    }
    throw new Error('Esperava recusa.');
  });
});

describe('correções no plano', () => {
  it('sem correções o resultado é idêntico ao atual', () => {
    expect(plano({ chuva: [], presencas: [] })).toEqual(plano());
    expect(plano().conferencia.every((c) => c.efeito === 0 && c.confere)).toBe(true);
    expect(linhasDeCorrecoes(plano())).toEqual([]);
  });

  it('data em chuva: a partida vira choveu e quem estava com 3 passa a 6 (expulso 2 vira 5)', () => {
    const p = plano({ chuva: ['2022-04-24'], presencas: [] });
    expect(p.partidas.find((x) => x.data === '2022-04-24')).toMatchObject({ choveu: true, mista: false });
    expect(conferenciaDe(p, 'Alfa')).toMatchObject({ efeito: 3, confere: true });
    expect(conferenciaDe(p, 'Bravo')).toMatchObject({ efeito: 3, confere: true });
    expect(conferenciaDe(p, 'Foxtrot').efeito).toBe(0);
    expect(p.correcoes.chuva).toEqual([{ data: '2022-04-24', atletasAfetados: 5 }]);
    expect(p.conferencia.every((c) => c.confere)).toBe(true);
  });

  it('chuva numa data que já tinha chuva não muda nada', () => {
    const p = plano({ chuva: ['2022-04-17'], presencas: [] });
    expect(p.conferencia.every((c) => c.efeito === 0)).toBe(true);
    expect(p.correcoes.chuva).toEqual([{ data: '2022-04-17', atletasAfetados: 0 }]);
  });

  it('presença corrigida vale a nova situação (inclusive de quem não tinha linha)', () => {
    const p = plano({
      chuva: [],
      presencas: [
        { data: '2022-04-10', atleta: 'bravo', situacao: 'presente' },
        { data: '2022-04-10', atleta: 'Alfa', situacao: 'ausente' },
        { data: '2022-05-08', atleta: 'Golf', situacao: 'lesionado' },
      ],
    });
    const segunda = p.partidas.find((x) => x.data === '2022-04-10')!;
    expect(segunda.presencas).toContainEqual({ apelido: 'Bravo', situacao: 'presente' });
    expect(segunda.presencas.map((x) => x.apelido)).not.toContain('Alfa');
    expect(p.partidas.find((x) => x.data === '2022-05-08')!.presencas).toContainEqual({
      apelido: 'Golf',
      situacao: 'lesionado',
    });
    expect(conferenciaDe(p, 'Bravo')).toMatchObject({ efeito: 3, confere: true });
    expect(conferenciaDe(p, 'Alfa')).toMatchObject({ efeito: -3, confere: true });
    expect(conferenciaDe(p, 'Golf')).toMatchObject({ efeito: 3, confere: true });
  });

  it('a divergência residual, sem correção cobrindo, continua bloqueando', () => {
    const adulterado = ATLETAS.map((a) => (a.apelido === 'Charlie' ? { ...a, inicial: a.inicial + 7 } : a));
    const pontuacoes = montarPontuacoes(adulterado).replace(/(\| Charlie \| ativo \| )19/, '$112');
    const p = calcularPlano(
      lerPontuacoes(pontuacoes, HOJE_DAS_FIXTURES),
      lerCadastro(montarCadastro(adulterado), HOJE_DAS_FIXTURES),
      HOJE_DAS_FIXTURES,
      { chuva: ['2022-04-24'], presencas: [] },
    );
    expect(p.conferencia.filter((c) => !c.confere).map((c) => c.apelido)).toEqual(['Charlie']);
  });

  it.each([
    ['chuva em data fora das rodadas', { chuva: ['2030-01-01'], presencas: [] }, /Correção de chuva nº 1.*data fora/],
    [
      'presença em data fora das rodadas',
      { chuva: [], presencas: [{ data: '2030-01-01', atleta: 'Alfa', situacao: 'presente' as const }] },
      /Correção de presença nº 1.*data fora/,
    ],
    [
      'atleta inexistente',
      { chuva: [], presencas: [{ data: '2022-04-10', atleta: 'Segredo', situacao: 'presente' as const }] },
      /Correção de presença nº 1.*atleta inexistente/,
    ],
    [
      'data e atleta repetidos',
      {
        chuva: [],
        presencas: [
          { data: '2022-04-10', atleta: 'Alfa', situacao: 'presente' as const },
          { data: '2022-04-10', atleta: 'alfa', situacao: 'expulso' as const },
        ],
      },
      /nº 2.*repete/,
    ],
  ])('recusa %s sem imprimir o nome', (_nome, correcoes, mensagem) => {
    expect(() => plano(correcoes)).toThrow(mensagem);
    expect(() => plano(correcoes)).not.toThrow(/segredo/i);
  });

  it('o relatório traz a seção "Correções do usuário" por data e por atleta', () => {
    const p = plano({ chuva: ['2022-04-24'], presencas: [] });
    expect(linhasDeCorrecoes(p)).toEqual([
      'Correções do usuário:',
      '  chuva em 2022-04-24: 5 atleta(s) mudam de pontos',
      '  presenças corrigidas: 0',
      '  atletas com total alterado: 5',
    ]);
    expect(linhasDeContagens(contarPlano(p)).join('\n')).toContain('Diferenças por correção do usuário: 5');
    expect(linhasDeConferencia(p).filter((l) => l.startsWith('correção do usuário: Alfa'))).toHaveLength(1);
    expect(linhasDeConferencia(p).some((l) => l.startsWith('DIVERGÊNCIA'))).toBe(false);
  });
});
