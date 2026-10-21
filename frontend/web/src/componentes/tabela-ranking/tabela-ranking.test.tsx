import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { rankingPublico, type RankingPublico } from '@pelada/contrato';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { violacoes } from '../../../test/apoio/axe';
import { Legenda, MarcaRodada, TabelaRanking } from './index';

const RESPOSTAS = join(import.meta.dirname, '../../../../../.md/mockup/respostas');
const carregar = (nome: string): RankingPublico =>
  rankingPublico.parse(JSON.parse(readFileSync(join(RESPOSTAS, nome), 'utf8')));

const linhaDe = (apelido: string) => screen.getByRole('rowheader', { name: apelido }).closest('tr') as HTMLElement;

describe('TabelaRanking (mês com partidas)', () => {
  const ranking = carregar('publico-ranking-2026-10.json');

  it('tem caption e cabeçalhos de coluna na ordem', () => {
    render(<TabelaRanking ranking={ranking} />);
    const tabela = screen.getByRole('table', { name: /Ranking geral da Pelada de Quinta.*outubro de 2026/ });
    const cabecalhos = within(tabela)
      .getAllByRole('columnheader')
      .map((c) => c.textContent);
    expect(cabecalhos).toEqual([
      '#',
      'Jogador',
      'Pts inicial (antes das partidas do mês)',
      '01/10, sem chuva',
      '08/10, com chuva',
      '15/10, sem chuva',
      'Pts final (acumulado até hoje)',
    ]);
  });

  it('linhas na ordem recebida, com o apelido em th scope=row', () => {
    render(<TabelaRanking ranking={ranking} />);
    const nomes = screen.getAllByRole('rowheader').map((c) => c.textContent);
    expect(nomes).toEqual(ranking.linhas.map((l) => l.apelido));
  });

  it('leitor de tela lê situação e pontos por extenso; o número visível é decorativo', () => {
    render(<TabelaRanking ranking={ranking} />);
    expect(within(linhaDe('Careca')).getByText('Lesionado, 1 ponto')).toBeInTheDocument();
    const marcao = linhaDe('Marcão');
    expect(within(marcao).getByText('Expulso, menos 1 ponto')).toBeInTheDocument();
    const visivel = within(marcao).getByText('−1');
    expect(visivel).toHaveAttribute('aria-hidden', 'true');
    expect(visivel.className).toContain('e');
    const juninho = within(linhaDe('Juninho'));
    expect(juninho.getByText('Falta, 0 pontos')).toBeInTheDocument();
    expect(juninho.getAllByText('0')[0]?.className).toContain('f');
    const leo = within(linhaDe('Léo Baiano'));
    expect(leo.getByText('Fora do grupo ou antes da data de início')).toBeInTheDocument();
    expect(leo.getByText('–')).toHaveAttribute('aria-hidden', 'true');
  });

  it('não soma nada: exibe exatamente o recebido, na ordem recebida', () => {
    const adulterado: RankingPublico = {
      ...ranking,
      linhas: [
        { posicao: 1, apelido: 'Zeca', ptsInicial: 5, ptsFinal: 999, rodadas: ranking.linhas[0]!.rodadas },
        { posicao: 1, apelido: 'Ana', ptsInicial: 5, ptsFinal: 3, rodadas: ranking.linhas[1]!.rodadas },
      ],
    };
    render(<TabelaRanking ranking={adulterado} />);
    expect(screen.getAllByRole('rowheader').map((c) => c.textContent)).toEqual(['Zeca', 'Ana']);
    expect(within(linhaDe('Zeca')).getByText('999')).toBeInTheDocument();
    expect(screen.getAllByText('1', { selector: 'td' })).toHaveLength(2);
  });

  it('sem violações do axe', async () => {
    const { container } = render(<TabelaRanking ranking={ranking} />);
    expect(await violacoes(container)).toEqual([]);
  });
});

describe('TabelaRanking (mês sem partidas)', () => {
  const ranking = carregar('publico-ranking-2026-07.json');

  it('mostra "Partidas do mês", uma célula com rowspan e os textos de início/fim', () => {
    render(<TabelaRanking ranking={ranking} />);
    const tabela = screen.getByRole('table');
    expect(within(tabela).getByRole('columnheader', { name: 'Partidas do mês' })).toBeInTheDocument();
    const aviso = within(tabela).getByText('Nenhuma partida registrada neste mês');
    expect(aviso).toHaveAttribute('rowspan', String(ranking.linhas.length));
    expect(within(tabela).getAllByText('Nenhuma partida registrada neste mês')).toHaveLength(1);
    expect(within(tabela).getByRole('columnheader', { name: /Pts inicial\s*\(início de julho\)/ })).toBeInTheDocument();
    expect(within(tabela).getByRole('columnheader', { name: /Pts final\s*\(fim de julho\)/ })).toBeInTheDocument();
  });

  it('sem violações do axe', async () => {
    const { container } = render(<TabelaRanking ranking={ranking} />);
    expect(await violacoes(container)).toEqual([]);
  });
});

describe('outros estados da resposta', () => {
  it.each(['publico-ranking-vazio.json', 'publico-ranking-endereco-novo.json'])('%s renderiza sem erro', (arquivo) => {
    expect(() => render(<TabelaRanking ranking={carregar(arquivo)} />)).not.toThrow();
  });

  it('tabela sem linhas não quebra', () => {
    const base = carregar('publico-ranking-2026-10.json');
    render(<TabelaRanking ranking={{ ...base, linhas: [] }} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
  });
});

describe('MarcaRodada', () => {
  it.each([
    ['presente', 1, 'p', 'Presente, 1 ponto'],
    ['lesionado', 1, 'l', 'Lesionado, 1 ponto'],
    ['expulso', -1, 'e', 'Expulso, menos 1 ponto'],
    ['falta', 0, 'f', 'Falta, 0 pontos'],
    ['fora', null, 'x', 'Fora do grupo ou antes da data de início'],
  ] as const)('%s', (situacao, pontos, classe, lido) => {
    const { container } = render(<MarcaRodada situacao={situacao} pontos={pontos} />);
    expect(container.querySelector('[aria-hidden="true"]')?.className).toContain(classe);
    expect(screen.getByText(lido)).toHaveClass('sr');
  });

  it('decorativa não tem texto para leitor de tela', () => {
    const { container } = render(<MarcaRodada situacao="presente" pontos={1} decorativa />);
    expect(container.querySelector('.sr')).toBeNull();
  });
});

describe('Legenda', () => {
  it('7 itens na ordem do mockup', () => {
    render(<Legenda />);
    const itens = screen.getAllByRole('listitem').map((li) => li.textContent?.replace(/^[^A-Za-zÀ-ú]+/, ''));
    expect(itens).toEqual([
      'Presente',
      'Lesionado (foi e não jogou)',
      'Expulso',
      'Falta',
      'Fora do grupo ou antes da data de início',
      'Jogo sem chuva',
      'Jogo com chuva',
    ]);
  });

  it('sem violações do axe', async () => {
    const { container } = render(<Legenda />);
    expect(await violacoes(container)).toEqual([]);
  });
});
