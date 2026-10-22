import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { periodoPreviaResposta, type PeriodoPreviaResposta } from '@pelada/contrato';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { violacoes } from '../../../test/apoio/axe';
import { listaDeDatas } from './listaDeDatas';
import { PreviaPeriodos } from './PreviaPeriodos';

const RAIZ = join(import.meta.dirname, '../../../../..');
const fixture = (nome: string) =>
  periodoPreviaResposta.parse(JSON.parse(readFileSync(join(RAIZ, `.md/mockup/respostas/${nome}.json`), 'utf8')));

const base: PeriodoPreviaResposta = {
  acumuladoAntes: 18,
  acumuladoDepois: 18,
  posicaoAntes: 15,
  posicaoDepois: 15,
  rodadasQuePassamAConstar: [],
  rodadasQueDeixamDeConstar: [],
  aviso: null,
};
const pronta = (extra: Partial<PeriodoPreviaResposta>) => (
  <PreviaPeriodos estado="pronta" previa={{ ...base, ...extra }} />
);
const rodadas = (datas: string[]) => datas.map((data) => ({ data, situacao: 'falta' as const }));

describe('listaDeDatas', () => {
  it('formata singular, "e" e "e mais N"', () => {
    expect(listaDeDatas(['2026-10-15'])).toBe('15/10');
    expect(listaDeDatas(['2026-10-08', '2026-10-15'])).toBe('08/10 e 15/10');
    expect(listaDeDatas(['2026-10-01', '2026-10-02', '2026-10-03'])).toBe('01/10, 02/10 e 03/10');
    const seis = ['01', '02', '03', '04', '05', '06'].map((d) => `2026-10-${d}`);
    expect(listaDeDatas(seis.slice(0, 5))).toBe('01/10, 02/10, 03/10, 04/10 e 05/10');
    expect(listaDeDatas(seis)).toBe('01/10, 02/10, 03/10, 04/10, 05/10 e mais 1');
  });
});

describe('PreviaPeriodos pronta', () => {
  it('retorno: acumulado, posição, rodada e aviso da API', () => {
    const { container } = render(<PreviaPeriodos estado="pronta" previa={fixture('periodo-previa-retorno')} />);
    expect(screen.getByText('Acumulado de 18 pontos não muda. Posição 15, não muda.')).toBeTruthy();
    expect(screen.getByText('1 rodada passa a constar: 15/10.')).toBeTruthy();
    expect(screen.getByText('Ela vale 0 ponto até você lançar a presença em Editar partida.')).toBeTruthy();
    expect(container.querySelector('.faixa--atencao')).not.toBeNull();
  });

  it('adiar: rodada que deixa de constar, sem aviso', () => {
    const { container } = render(<PreviaPeriodos estado="pronta" previa={fixture('periodo-previa-adiar')} />);
    expect(screen.getByText('1 rodada deixa de constar: 15/10.')).toBeTruthy();
    expect(container.querySelector('.faixa--atencao')).toBeNull();
  });

  it('saída: uma rodada passa a constar com aviso', () => {
    render(<PreviaPeriodos estado="pronta" previa={fixture('periodo-previa-saida')} />);
    expect(screen.getByText('1 rodada passa a constar: 08/10.')).toBeTruthy();
  });

  it('reativar sem posição antes: passa a aparecer, duas rodadas, aviso no plural', () => {
    render(<PreviaPeriodos estado="pronta" previa={fixture('reativar-previa-beto')} />);
    expect(
      screen.getByText('Acumulado de 18 pontos não muda. Passa a aparecer no ranking, na posição 15.'),
    ).toBeTruthy();
    expect(screen.getByText('2 rodadas passam a constar: 08/10 e 15/10.')).toBeTruthy();
    expect(screen.getByText('Elas valem 0 ponto até você lançar a presença em Editar partida.')).toBeTruthy();
  });

  it('acumulado negativo usa U+2212 nos dois números', () => {
    render(pronta({ acumuladoAntes: -1, acumuladoDepois: -3, posicaoAntes: 15, posicaoDepois: 15 }));
    expect(screen.getByText('Acumulado de −1 ponto passa a −3. Posição 15, não muda.')).toBeTruthy();
  });

  it('acumulado muda, singular de ponto e posição de N para M', () => {
    render(pronta({ acumuladoAntes: 1, acumuladoDepois: 3, posicaoAntes: 15, posicaoDepois: 12 }));
    expect(screen.getByText('Acumulado de 1 ponto passa a 3. Posição de 15 para 12.')).toBeTruthy();
  });

  it('sai do ranking', () => {
    render(pronta({ posicaoDepois: null }));
    expect(screen.getByText('Acumulado de 18 pontos não muda. Sai do ranking (hoje está na posição 15).')).toBeTruthy();
  });

  it('sem posição nos dois: a linha não aparece', () => {
    render(pronta({ posicaoAntes: null, posicaoDepois: null }));
    expect(screen.getByText('Acumulado de 18 pontos não muda.')).toBeTruthy();
    expect(screen.queryByText(/osição/)).toBeNull();
  });

  it('seis datas viram cinco e "e mais 1"; listas vazias não geram linha', () => {
    const datas = ['01', '02', '03', '04', '05', '06'].map((d) => `2026-10-${d}`);
    render(pronta({ rodadasQuePassamAConstar: rodadas(datas) }));
    expect(screen.getByText('6 rodadas passam a constar: 01/10, 02/10, 03/10, 04/10, 05/10 e mais 1.')).toBeTruthy();
    expect(screen.queryByText(/deixam? de constar/)).toBeNull();
  });
});

describe('PreviaPeriodos calculando e falha', () => {
  it('"Calculando…" fica na região aria-live', () => {
    const { container } = render(<PreviaPeriodos estado="calculando" />);
    expect(screen.getByText('Calculando…').closest('[aria-live="polite"]')).toBe(container.firstElementChild);
  });

  it('falha de rede é alerta e Tentar de novo chama aoTentar', async () => {
    const aoTentar = vi.fn();
    render(<PreviaPeriodos estado="falhaRede" aoTentar={aoTentar} />);
    expect(screen.getByRole('alert').textContent).toContain('Não foi possível calcular. Verifique a conexão.');
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(aoTentar).toHaveBeenCalledTimes(1);
  });
});

describe('PreviaPeriodos acessibilidade', () => {
  it('axe sem violação em cada estado', async () => {
    const estados = [
      <PreviaPeriodos key="c" estado="calculando" />,
      <PreviaPeriodos key="p" estado="pronta" previa={fixture('periodo-previa-retorno')} />,
      <PreviaPeriodos key="f" estado="falhaRede" aoTentar={() => undefined} />,
    ];
    for (const estado of estados) {
      const { container, unmount } = render(estado);
      expect(await violacoes(container)).toEqual([]);
      unmount();
    }
  });
});
