import { describe, expect, it } from 'vitest';
import { lerCadastro, posicaoDoLegado } from '../../importar-legado/leitura-cadastro.ts';
import { lerPontuacoes } from '../../importar-legado/leitura-pontuacoes.ts';
import { ErroLegado } from '../../importar-legado/tipos.ts';
import { ATLETAS, HOJE_DAS_FIXTURES, montarCadastro, montarPontuacoes } from './fixtures.ts';

const pontuacoes = montarPontuacoes();
const cadastro = montarCadastro();

/** Troca a primeira ocorrência e garante que a troca aconteceu. */
function trocar(texto: string, de: string, para: string): string {
  expect(texto).toContain(de);
  return texto.replace(de, para);
}

function numeroDaLinha(texto: string, trecho: string): number {
  return texto.split('\n').findIndex((l) => l.includes(trecho)) + 1;
}

function falha(acao: () => unknown): ErroLegado {
  try {
    acao();
  } catch (erro) {
    expect(erro).toBeInstanceOf(ErroLegado);
    return erro as ErroLegado;
  }
  throw new Error('Esperava uma falha de leitura.');
}

describe('leitura de Pontuacoes.md', () => {
  const lidas = lerPontuacoes(pontuacoes, HOJE_DAS_FIXTURES);

  it('lê a classificação com inicial, ajustes e Atual', () => {
    expect(lidas.classificacao).toHaveLength(ATLETAS.length);
    const eco = lidas.classificacao.find((c) => c.apelido === 'Eco');
    expect(eco).toMatchObject({ situacao: 'ativo', inicial: 10, ajustes: 3, atual: 28 });
    expect(lidas.classificacao.find((c) => c.apelido === 'Foxtrot')?.situacao).toBe('inativo');
  });

  it('lê as seis rodadas em ordem de data, com o ano do título do mês', () => {
    expect(lidas.rodadas.map((r) => r.data)).toEqual([
      '2022-04-03',
      '2022-04-10',
      '2022-04-17',
      '2022-04-24',
      '2022-05-01',
      '2022-05-08',
    ]);
  });

  it('"—" vira sem registro e atleta sem linha no mês não aparece', () => {
    const [, abril10] = lidas.rodadas;
    expect(abril10?.valores.get('charlie')?.valor).toBeNull();
    expect(lidas.rodadas[0]?.valores.get('delta')?.valor).toBeNull();
    expect(lidas.rodadas[4]?.valores.has('foxtrot')).toBe(false);
    expect(lidas.rodadas.some((r) => r.valores.has('golf'))).toBe(false);
  });

  it.each([
    [
      'valor de rodada fora de {0,2,3,5,6,—}',
      '| Alfa | 3 | 3 | 6 | 3 | 15',
      '| Alfa | 3 | 4 | 6 | 3 | 15',
      /valor de rodada/,
    ],
    ['valor de rodada negativo', '| Alfa | 3 | 3 | 6 | 3 | 15', '| Alfa | 3 | -3 | 6 | 3 | 15', /valor de rodada/],
    ['coluna Mês diferente da soma', '| Alfa | 3 | 3 | 6 | 3 | 15', '| Alfa | 3 | 3 | 6 | 3 | 14', /Mês/],
    ['linha com colunas a menos', '| Alfa | 3 | 3 | 6 | 3 | 15 | 0 |', '| Alfa | 3 | 3 | 6 | 15 | 0 |', /colunas/],
    ['atleta repetido no mês', '| Bravo | 3 | 0 | 6 | 2 | 11', '| Alfa | 3 | 0 | 6 | 2 | 11', /repetido/],
    ['pontuação inicial acima de 9999', '| Alfa | ativo | 30 |', '| Alfa | ativo | 10000 |', /inicial/],
    ['situação desconhecida', '| Alfa | ativo |', '| Alfa | talvez |', /situação/],
    ['apelido de 1 caractere', '| Alfa | ativo |', '| A | ativo |', /apelido/],
    ['apelido gigante', '| Alfa | ativo |', `| ${'x'.repeat(200)} | ativo |`, /apelido/],
    ['apelido com fórmula de planilha', '| Alfa | ativo |', '| =SOMA(A1) | ativo |', /fórmula/],
    ['apelido começando com arroba', '| Alfa | ativo |', '| @cmd | ativo |', /fórmula/],
    ['caractere de controle', '| Alfa | ativo |', '| Al\u0007fa | ativo |', /controle/],
  ])('%s aborta com o número da linha', (_nome, de, para, mensagem) => {
    const texto = trocar(pontuacoes, de, para);
    const erro = falha(() => lerPontuacoes(texto, HOJE_DAS_FIXTURES));
    expect(erro.message).toMatch(/^Linha \d+: /);
    expect(erro.message).toMatch(mensagem);
    expect(erro.message).not.toContain('Alfa');
    expect(erro.linha).toBeGreaterThan(0);
  });

  it('a linha citada é a da linha inválida', () => {
    const texto = trocar(pontuacoes, '| Alfa | 3 | 3 | 6 | 3 | 15', '| Alfa | 3 | 4 | 6 | 3 | 15');
    const esperada = numeroDaLinha(texto, '| Alfa | 3 | 4 | 6 | 3 |');
    expect(falha(() => lerPontuacoes(texto, HOJE_DAS_FIXTURES)).linha).toBe(esperada);
  });

  it('duas rodadas na mesma data abortam', () => {
    const texto = trocar(pontuacoes, '| Atleta | 01/05 | 08/05 |', '| Atleta | 24/04 | 08/05 |').replace(
      '#### Maio 2022',
      '#### Abril 2022',
    );
    expect(falha(() => lerPontuacoes(texto, HOJE_DAS_FIXTURES)).message).toMatch(/mesma data/);
  });

  it('data futura aborta', () => {
    expect(falha(() => lerPontuacoes(pontuacoes, '2022-04-20')).message).toMatch(/futuro/);
  });

  it('data inexistente e data fora do mês do título abortam', () => {
    const inexistente = trocar(pontuacoes, '| Atleta | 03/04 |', '| Atleta | 31/04 |');
    expect(falha(() => lerPontuacoes(inexistente, HOJE_DAS_FIXTURES)).message).toMatch(/inexistente/);
    const foraDoMes = trocar(pontuacoes, '| Atleta | 03/04 |', '| Atleta | 03/05 |');
    expect(falha(() => lerPontuacoes(foraDoMes, HOJE_DAS_FIXTURES)).message).toMatch(/fora do mês/);
  });

  it('arquivo sem as seções esperadas aborta', () => {
    expect(falha(() => lerPontuacoes('# nada\n', HOJE_DAS_FIXTURES))).toBeInstanceOf(ErroLegado);
    expect(falha(() => lerPontuacoes('', HOJE_DAS_FIXTURES))).toBeInstanceOf(ErroLegado);
  });
});

describe('leitura de Cadastro.md', () => {
  it('lê ativos (ano, posição principal, seis notas) e inativos', () => {
    const lido = lerCadastro(cadastro, HOJE_DAS_FIXTURES);
    expect(lido.ativos.map((a) => a.apelido)).toEqual(['Alfa', 'Bravo', 'Charlie', 'Delta', 'Eco', 'Golf']);
    expect(lido.ativos[0]).toEqual({
      apelido: 'Alfa',
      anoNascimento: 1980,
      posicao: 'meia',
      notas: [8, 7, 6, 7, 8, 5],
    });
    expect(lido.ativos.find((a) => a.apelido === 'Charlie')?.posicao).toBe('lateral');
    expect(lido.inativos).toEqual(['Foxtrot']);
  });

  it('telefone e data de nascimento completa nunca entram no resultado', () => {
    const texto = JSON.stringify(lerCadastro(cadastro, HOJE_DAS_FIXTURES));
    expect(texto).not.toContain('00000');
    expect(texto).not.toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(texto).not.toContain('15/03');
  });

  it('o conteúdo da coluna de telefone não é lido: lixo ali não muda nada', () => {
    const comLixo = cadastro.replaceAll('(00) 00000-0000', 'não é telefone ---');
    expect(lerCadastro(comLixo, HOJE_DAS_FIXTURES)).toEqual(lerCadastro(cadastro, HOJE_DAS_FIXTURES));
  });

  it.each([
    ['nota 0', '| Alfa | 8 | 7 | 6 | 7 | 8 | 5 |', '| Alfa | 0 | 7 | 6 | 7 | 8 | 5 |', /nota/],
    ['nota 11', '| Alfa | 8 | 7 | 6 | 7 | 8 | 5 |', '| Alfa | 8 | 7 | 6 | 7 | 11 | 5 |', /nota/],
    ['nota em texto', '| Alfa | 8 | 7 | 6 | 7 | 8 | 5 |', '| Alfa | 8 | 7 | x | 7 | 8 | 5 |', /nota/],
    ['posição desconhecida', '| Meia, Atacante |', '| Ponta |', /posição/],
    ['posição vazia', '| Meia, Atacante |', '|  |', /posição/],
    ['nascimento inexistente', '| 15/03/1980 |', '| 31/02/1980 |', /inexistente/],
    ['nascimento em formato errado', '| 15/03/1980 |', '| 1980-03-15 |', /nascimento/],
    ['nascimento antes de 1940', '| 15/03/1980 |', '| 15/03/1939 |', /ano de nascimento/],
    ['nascimento com menos de 10 anos', '| 15/03/1980 |', '| 15/03/2015 |', /ano de nascimento/],
  ])('%s aborta com o número da linha', (_nome, de, para, mensagem) => {
    const texto = trocar(cadastro, de, para);
    const erro = falha(() => lerCadastro(texto, HOJE_DAS_FIXTURES));
    expect(erro.message).toMatch(/^Linha \d+: /);
    expect(erro.message).toMatch(mensagem);
    expect(erro.message).not.toContain('Alfa');
  });

  it('ativo sem linha de habilidades aborta', () => {
    const texto = cadastro
      .split('\n')
      .filter((l) => !l.startsWith('| 6 | Golf | 7'))
      .join('\n');
    expect(falha(() => lerCadastro(texto, HOJE_DAS_FIXTURES)).message).toMatch(/sem notas/);
  });
});

describe('posições do legado', () => {
  it.each([
    ['Zagueiro', 'zagueiro'],
    ['Lateral', 'lateral'],
    ['Volante', 'volante'],
    ['Meia', 'meia'],
    ['Atacante', 'atacante'],
    ['Centroavante', 'centroavante'],
    ['Goleiro', 'goleiro'],
    ['Defensor', 'zagueiro'],
    ['Meio-campo', 'meia'],
    ['  meio campo ', 'meia'],
    ['GOLEIRO', 'goleiro'],
  ])('%s → %s', (texto, esperado) => {
    expect(posicaoDoLegado(texto)).toBe(esperado);
  });

  it.each(['', 'Ponta', 'Libero', '1', 'zagueiro, lateral'])('%j não é posição', (texto) => {
    expect(posicaoDoLegado(texto)).toBeNull();
  });
});
