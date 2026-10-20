/**
 * Arquivos fictícios no formato do legado (Pontuacoes.md e Cadastro.md). Todo nome, data e número aqui é
 * inventado: nenhum dado do arquivo real entra no repositório.
 */
export type CelulaDeRodada = number | '—' | undefined;

export interface AtletaFicticio {
  apelido: string;
  ativo: boolean;
  inicial: number;
  ajustes?: number;
  /** Valor em cada data de `RODADAS_DAS_FIXTURES`; `undefined` = sem linha naquele mês. */
  rodadas: CelulaDeRodada[];
  nascimento?: string;
  posicoes?: string;
  notas?: number[];
}

export const MESES_DAS_FIXTURES = [
  { titulo: 'Abril 2022', datas: ['03/04', '10/04', '17/04', '24/04'] },
  { titulo: 'Maio 2022', datas: ['01/05', '08/05'] },
] as const;

/** Mês fixo de referência para "hoje" dos testes: depois de todas as rodadas fictícias. */
export const HOJE_DAS_FIXTURES = '2022-06-15';

/** 17/04 teve chuva (valores em dobro: 6 e 5). */
export const ATLETAS: AtletaFicticio[] = [
  {
    apelido: 'Alfa',
    ativo: true,
    inicial: 30,
    rodadas: [3, 3, 6, 3, 3, 3],
    nascimento: '15/03/1980',
    posicoes: 'Meia, Atacante',
    notas: [8, 7, 6, 7, 8, 5],
  },
  {
    apelido: 'Bravo',
    ativo: true,
    inicial: 0,
    rodadas: [3, 0, 6, 2, 3, 0],
    nascimento: '02/11/1975',
    posicoes: 'Zagueiro',
    notas: [5, 5, 5, 5, 5, 5],
  },
  {
    apelido: 'Charlie',
    ativo: true,
    inicial: 12,
    rodadas: [3, '—', 6, 3, 3, 3],
    nascimento: '20/07/1990',
    posicoes: 'Lateral, Volante',
    notas: [6, 6, 6, 6, 6, 6],
  },
  {
    apelido: 'Delta',
    ativo: true,
    inicial: 0,
    rodadas: ['—', '—', 6, 3, 3, 3],
    nascimento: '09/09/1985',
    posicoes: 'Centroavante',
    notas: [9, 9, 9, 9, 9, 9],
  },
  {
    apelido: 'Eco',
    ativo: true,
    inicial: 10,
    ajustes: 3,
    rodadas: [3, 3, 6, 3, 0, 0],
    nascimento: '01/01/1970',
    posicoes: 'Goleiro',
    notas: [4, 4, 4, 4, 4, 4],
  },
  {
    apelido: 'Golf',
    ativo: true,
    inicial: 0,
    rodadas: [undefined, undefined, undefined, undefined, undefined, undefined],
    nascimento: '30/12/1995',
    posicoes: 'Volante',
    notas: [7, 7, 7, 7, 7, 7],
  },
  { apelido: 'Foxtrot', ativo: false, inicial: 5, rodadas: [3, 3, 0, 0, undefined, undefined] },
];

const PESO_DA_CELULA: Record<number, number> = { 0: 0, 2: 2, 3: 3, 5: 5, 6: 6 };

export const pontosDeRodadas = (a: AtletaFicticio): number =>
  a.rodadas.reduce<number>((soma, c) => soma + (typeof c === 'number' ? (PESO_DA_CELULA[c] ?? 0) : 0), 0);

export const atualDe = (a: AtletaFicticio): number => a.inicial + (a.ajustes ?? 0) + pontosDeRodadas(a);

const sinal = (n: number): string => (n === 0 ? '' : n > 0 ? `+${n}` : String(n));

export function montarPontuacoes(atletas: readonly AtletaFicticio[] = ATLETAS): string {
  const linhas = [
    '# Grupo Ficticio · Pontuações rodada a rodada',
    '',
    '## Classificação atual',
    '',
    '| # | Atleta | Situação | Inicial abr/2022 | Ajustes | Rodadas jogadas | Pontos em rodadas | Atual |',
    '|---:|---|---|---:|---:|---:|---:|---:|',
  ];
  atletas.forEach((a, i) => {
    const posicao = a.ativo ? String(i + 1) : '';
    linhas.push(
      `| ${posicao} | ${a.apelido} | ${a.ativo ? 'ativo' : 'inativo'} | ${a.inicial} | ${sinal(a.ajustes ?? 0)} | 0 | ${pontosDeRodadas(a)} | **${atualDe(a)}** |`,
    );
  });
  linhas.push('', '## Rodada a rodada', '', '### 2022', '');
  let coluna = 0;
  for (const mes of MESES_DAS_FIXTURES) {
    linhas.push(`#### ${mes.titulo}`, '', `| Atleta | ${mes.datas.join(' | ')} | Mês | Acum. |`);
    linhas.push(`|---|${mes.datas.map(() => '---:').join('|')}|---:|---:|`);
    const indices = mes.datas.map((_, k) => coluna + k);
    for (const a of atletas) {
      const celulas = indices.map((i) => a.rodadas[i]);
      if (celulas.every((c) => c === undefined)) continue;
      const soma = celulas.reduce<number>((s, c) => s + (typeof c === 'number' ? c : 0), 0);
      linhas.push(`| ${a.apelido} | ${celulas.map((c) => c ?? '—').join(' | ')} | ${soma} | 0 |`);
    }
    linhas.push('');
    coluna += mes.datas.length;
  }
  return linhas.join('\n');
}

export function montarCadastro(atletas: readonly AtletaFicticio[] = ATLETAS): string {
  const ativos = atletas.filter((a) => a.ativo);
  const linhas = [
    '# Grupo Ficticio · Cadastro de jogadores',
    '',
    '## Ativos — dados',
    '',
    '| # | Atleta | Telefone | Nascimento | Idade | Pontuação | Posições preferidas | Cadastro |',
    '|---:|---|---|---|---:|---:|---|---|',
  ];
  ativos.forEach((a, i) => {
    linhas.push(
      `| ${i + 1} | ${a.apelido} | (00) 00000-0000 | ${a.nascimento} | 40 | ${atualDe(a)} | ${a.posicoes} | 01/01/2022 |`,
    );
  });
  linhas.push('', '## Ativos — habilidades', '', 'Ordenado pela soma.', '');
  linhas.push('| # | Atleta | Visão | Passe | Físico | Drible | Chute | Desarme | Soma | |');
  linhas.push('|---:|---|---:|---:|---:|---:|---:|---:|---:|:-:|');
  ativos.forEach((a, i) => {
    const notas = a.notas ?? [];
    linhas.push(`| ${i + 1} | ${a.apelido} | ${notas.join(' | ')} | **${notas.reduce((s, n) => s + n, 0)}** | ✓ |`);
  });
  linhas.push('', '## Inativos', '', '| Atleta | Telefone | Pontuação final |', '|---|---|---:|');
  for (const a of atletas.filter((x) => !x.ativo)) linhas.push(`| ${a.apelido} | — | ${atualDe(a)} |`);
  return linhas.join('\n');
}
