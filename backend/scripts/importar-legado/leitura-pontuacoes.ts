import { apelidoDoArquivo } from './apelido.ts';
import { celulaDe, colunaDe, dividirLinhas, inteiroDe, normalizar, tabelasDaSecao, type Tabela } from './tabela-md.ts';
import {
  chaveDe,
  ErroLegado,
  type LinhaClassificacao,
  type PontuacoesLidas,
  type RodadaLida,
  type ValorDeRodada,
} from './tipos.ts';

const MESES = [
  'janeiro',
  'fevereiro',
  'marco',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];
const VALORES_DE_RODADA = new Set([0, 2, 3, 5, 6]);
const AUSENTE = new Set(['—', '–', '-', '']);

function lerClassificacao(tabelas: Tabela[]): LinhaClassificacao[] {
  const tabela = tabelas[0];
  if (!tabela) throw new ErroLegado('seção "Classificação atual" não encontrada.');
  const quantas = tabela.cabecalho.celulas.length;
  const [iApelido, iSituacao, iInicial, iAjustes, iAtual] = [
    colunaDe(tabela, 'Atleta', (c) => c === 'atleta'),
    colunaDe(tabela, 'Situação', (c) => c === 'situacao'),
    colunaDe(tabela, 'Inicial', (c) => c.startsWith('inicial')),
    colunaDe(tabela, 'Ajustes', (c) => c === 'ajustes'),
    colunaDe(tabela, 'Atual', (c) => c === 'atual'),
  ];
  return tabela.linhas.map((l): LinhaClassificacao => {
    const apelido = apelidoDoArquivo(celulaDe(l, iApelido, quantas), l.numero);
    const situacao = normalizar(celulaDe(l, iSituacao, quantas));
    if (situacao !== 'ativo' && situacao !== 'inativo')
      throw new ErroLegado('situação diferente de ativo/inativo.', l.numero);
    const inicial = inteiroDe(celulaDe(l, iInicial, quantas));
    const atual = inteiroDe(celulaDe(l, iAtual, quantas));
    const textoAjustes = celulaDe(l, iAjustes, quantas);
    const ajustes = textoAjustes === '' ? 0 : inteiroDe(textoAjustes);
    if (inicial === null || inicial < 0 || inicial > 9999)
      throw new ErroLegado('pontuação inicial fora de 0 a 9999.', l.numero);
    if (atual === null) throw new ErroLegado('valor "Atual" inválido.', l.numero);
    if (ajustes === null) throw new ErroLegado('valor de ajuste inválido.', l.numero);
    return { linha: l.numero, apelido, situacao, inicial, ajustes, atual };
  });
}

function mesDoTitulo(titulo: string, linha: number): { mes: number; ano: number } {
  const achado = /^([^\d]+)\s+(\d{4})$/.exec(normalizar(titulo));
  const mes = achado ? MESES.indexOf((achado[1] ?? '').trim()) : -1;
  if (!achado || mes < 0) throw new ErroLegado('título do mês inválido.', linha);
  return { mes: mes + 1, ano: Number(achado[2]) };
}

function dataDaColuna(texto: string, ano: number, mesDoTituloDaTabela: number, linha: number, hoje: string): string {
  const achado = /^(\d{2})\/(\d{2})$/.exec(texto.trim());
  if (!achado) throw new ErroLegado('cabeçalho de data inválido.', linha);
  const [dia, mes] = [Number(achado[1]), Number(achado[2])];
  const real = new Date(Date.UTC(ano, mes - 1, dia));
  if (real.getUTCMonth() !== mes - 1 || real.getUTCDate() !== dia) throw new ErroLegado('data inexistente.', linha);
  if (mes !== mesDoTituloDaTabela) throw new ErroLegado('data fora do mês do título.', linha);
  const data = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  if (data > hoje) throw new ErroLegado('data no futuro.', linha);
  return data;
}

function valorDaRodada(texto: string, linha: number): ValorDeRodada {
  if (AUSENTE.has(texto.trim())) return null;
  const numero = inteiroDe(texto);
  if (numero === null || !VALORES_DE_RODADA.has(numero))
    throw new ErroLegado('valor de rodada fora de {0, 2, 3, 5, 6, —}.', linha);
  return numero as ValorDeRodada;
}

function lerMes(tabela: Tabela, hoje: string, jaLidas: Set<string>): RodadaLida[] {
  const { mes, ano } = mesDoTitulo(tabela.titulo, tabela.cabecalho.numero);
  const cabecalho = tabela.cabecalho.celulas;
  const iApelido = colunaDe(tabela, 'Atleta', (c) => c === 'atleta');
  const colunasDeData = cabecalho.flatMap((c, i) => (/^\d{2}\/\d{2}$/.test(c.trim()) ? [i] : []));
  const rodadas: RodadaLida[] = colunasDeData.map((i) => {
    const data = dataDaColuna(cabecalho[i]!, ano, mes, tabela.cabecalho.numero, hoje);
    if (jaLidas.has(data)) throw new ErroLegado('duas rodadas na mesma data.', tabela.cabecalho.numero);
    jaLidas.add(data);
    return { data, valores: new Map() };
  });
  const iMes = cabecalho.findIndex((c) => normalizar(c) === 'mes');
  for (const l of tabela.linhas) {
    const apelido = apelidoDoArquivo(celulaDe(l, iApelido, cabecalho.length), l.numero);
    let soma = 0;
    colunasDeData.forEach((i, k) => {
      const valor = valorDaRodada(celulaDe(l, i, cabecalho.length), l.numero);
      soma += valor ?? 0;
      const chave = chaveDe(apelido);
      if (rodadas[k]!.valores.has(chave)) throw new ErroLegado('atleta repetido no mês.', l.numero);
      rodadas[k]!.valores.set(chave, { apelido, valor, linha: l.numero });
    });
    if (iMes >= 0 && inteiroDe(celulaDe(l, iMes, cabecalho.length)) !== soma) {
      throw new ErroLegado('coluna "Mês" diferente da soma das rodadas.', l.numero);
    }
  }
  return rodadas;
}

/**
 * Lê `Pontuacoes.md`: a classificação atual (inicial, ajustes e "Atual") e as rodadas de cada mês.
 * Qualquer linha inválida aborta com o número dela; nada é gravado nesta etapa.
 */
export function lerPontuacoes(texto: string, hoje: string): PontuacoesLidas {
  const linhas = dividirLinhas(texto);
  const classificacao = lerClassificacao(tabelasDaSecao(linhas, (t) => t.startsWith('classificacao atual')));
  const meses = tabelasDaSecao(linhas, (t) => t.startsWith('rodada a rodada'));
  if (meses.length === 0) throw new ErroLegado('seção "Rodada a rodada" não encontrada.');
  const jaLidas = new Set<string>();
  const rodadas = meses.flatMap((tabela) => lerMes(tabela, hoje, jaLidas));
  return { classificacao, rodadas: rodadas.sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0)) };
}
