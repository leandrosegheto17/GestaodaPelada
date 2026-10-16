import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { sugestaoDois, sugestaoVarios } from '@pelada/contrato';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { violacoes } from '../../../test/apoio/axe';
import { CartaoTime, JogadorTime, ListaAvisos, TabelaComparativa } from '.';

const RESPOSTAS = join(import.meta.dirname, '../../../../../.md/mockup/respostas');
const arquivo = (nome: string): unknown => JSON.parse(readFileSync(join(RESPOSTAS, nome), 'utf8'));
const dois = sugestaoDois.parse(arquivo('simulador-sugestao-dois.json'));
const varios = sugestaoVarios.parse(arquivo('simulador-sugestao-varios.json'));
const [timeA, timeB] = dois.times;

describe('CartaoTime (2 times)', () => {
  it('Time A: titulares, selos de saída, entram no 2º tempo e trocas', () => {
    render(<CartaoTime formato="dois_times" time={timeA} variante="A" aoTocar={() => undefined} />);
    const cartao = screen.getByRole('region', { name: 'Time A' });
    expect(within(cartao).getAllByRole('button')).toHaveLength(9);
    const rafinha = within(cartao).getByRole('button', { name: /Rafinha/ });
    expect(within(rafinha).getByText('sai no intervalo')).toBeInTheDocument();
    expect(within(cartao).getByRole('heading', { name: 'Entram no 2º tempo' })).toBeInTheDocument();
    expect(within(cartao).getByText('Pedrão → Cabeça')).toBeInTheDocument();
    expect(within(cartao).getByText('Rafinha → Japa')).toBeInTheDocument();
  });

  it('Time B: "só 1º tempo" + "sai no intervalo" no Juninho e "sem nota" no Léo Baiano', () => {
    render(<CartaoTime formato="dois_times" time={timeB} variante="B" aoTocar={() => undefined} />);
    const juninho = screen.getByRole('button', { name: /Juninho/ });
    expect(within(juninho).getByText('só 1º tempo')).toBeInTheDocument();
    expect(within(juninho).getByText('sai no intervalo')).toBeInTheDocument();
    expect(within(screen.getByRole('button', { name: /Léo Baiano/ })).getByText('sem nota')).toBeInTheDocument();
  });

  it('reserva "só 1º tempo" ganha o selo "joga só o 2º tempo"', () => {
    const reserva = { ...timeA.entramNo2oTempo[0]!, so1oTempo: true };
    render(
      <CartaoTime
        formato="dois_times"
        time={{ ...timeA, entramNo2oTempo: [reserva] }}
        variante="A"
        aoTocar={() => undefined}
      />,
    );
    expect(screen.getByText('joga só o 2º tempo')).toBeInTheDocument();
  });

  it('cada jogador é botão com aria-haspopup="dialog"; clique e Enter chamam aoTocar com o id', async () => {
    const aoTocar = vi.fn();
    render(<CartaoTime formato="dois_times" time={timeA} variante="A" aoTocar={aoTocar} />);
    const toninho = screen.getByRole('button', { name: /Toninho/ });
    expect(toninho).toHaveAttribute('aria-haspopup', 'dialog');
    await userEvent.click(toninho);
    toninho.focus();
    await userEvent.keyboard('{Enter}');
    expect(aoTocar).toHaveBeenNthCalledWith(1, 'j-toninho');
    expect(aoTocar).toHaveBeenCalledTimes(2);
  });

  it('movido: selo "movido"', () => {
    render(
      <CartaoTime
        formato="dois_times"
        time={timeA}
        variante="A"
        movidos={new Set(['j-japa'])}
        aoTocar={() => undefined}
      />,
    );
    expect(within(screen.getByRole('button', { name: /Japa/ })).getByText('movido')).toBeInTheDocument();
  });
});

describe('CartaoTime (3 ou mais times)', () => {
  const incompleto = varios.times[4]!;

  it('incompleto: selo "Incompleto (2 de 4)" e indicadores formatados', () => {
    render(<CartaoTime formato="varios_times" time={incompleto} n={4} aoTocar={() => undefined} />);
    expect(screen.getByText('Incompleto (2 de 4)')).toBeInTheDocument();
    const indicadores = screen.getByRole('region', { name: /Time 5/ });
    expect(within(indicadores).getByText('2')).toBeInTheDocument();
    expect(within(indicadores).getByText('6,5')).toBeInTheDocument();
    expect(within(indicadores).getByText('13,0')).toBeInTheDocument();
    expect(within(indicadores).getByText('33,5')).toBeInTheDocument();
    expect(screen.queryByText('Titulares')).not.toBeInTheDocument();
  });

  it('recalculando: os valores viram "recalculando…"', () => {
    render(<CartaoTime formato="varios_times" time={varios.times[0]!} n={4} recalculando aoTocar={() => undefined} />);
    expect(screen.getAllByText('recalculando…')).toHaveLength(4);
  });
});

describe('TabelaComparativa', () => {
  it('formata soma · média e idade com vírgula', () => {
    render(<TabelaComparativa times={[timeA, timeB]} />);
    expect(screen.getByText('44,1 · 6,3')).toBeInTheDocument();
    expect(screen.getByText('44,8 · 6,4')).toBeInTheDocument();
    expect(screen.getByText('42,3')).toBeInTheDocument();
    expect(screen.getByText('41,7')).toBeInTheDocument();
    expect(screen.getAllByText('2')).toHaveLength(2);
  });

  it('recalculando: oito células, aria-busy e anúncio de status', () => {
    render(<TabelaComparativa times={[timeA, timeB]} recalculando />);
    expect(screen.getAllByText('recalculando…')).toHaveLength(8);
    expect(screen.getByRole('table', { name: 'Comparação entre os times' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Recalculando os indicadores…');
  });
});

describe('ListaAvisos', () => {
  it('mostra o texto da API em role=status; vazio não renderiza nada', () => {
    const { container, rerender } = render(<ListaAvisos avisos={dois.avisos} />);
    expect(screen.getByRole('status')).toHaveTextContent('Léo Baiano e Serginho não têm nota: usamos nível 5,5.');
    rerender(<ListaAvisos avisos={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('JogadorTime', () => {
  it('sem selos, só o apelido', () => {
    render(<JogadorTime apelido="Neném" aoTocar={() => undefined} />);
    expect(screen.getByRole('button', { name: 'Neném' })).toBeInTheDocument();
  });
});

describe('acessibilidade', () => {
  it('axe: sem violações nos cartões, na tabela e nos avisos', async () => {
    const { container } = render(
      <main>
        <h1>Times</h1>
        <ListaAvisos avisos={dois.avisos} />
        <TabelaComparativa times={[timeA, timeB]} />
        <CartaoTime formato="dois_times" time={timeA} variante="A" aoTocar={() => undefined} />
        <CartaoTime formato="varios_times" time={varios.times[4]!} n={4} aoTocar={() => undefined} />
      </main>,
    );
    expect(await violacoes(container)).toEqual([]);
  });
});
