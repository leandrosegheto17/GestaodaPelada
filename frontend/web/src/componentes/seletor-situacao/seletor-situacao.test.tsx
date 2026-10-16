import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { partidaNova, SITUACOES_PRESENCA, type SituacaoPresenca } from '@pelada/contrato';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { violacoes } from '../../../test/apoio/axe';
import { contarSituacoes, ContagemFixa, LinhaJogador, ListaSituacao, SeletorSituacao } from './index';

const RAIZ = join(import.meta.dirname, '../../../../..');
const partida = partidaNova.parse(
  JSON.parse(readFileSync(join(RAIZ, '.md/mockup/respostas/partida-nova-2026-10-22.json'), 'utf8')),
);

function Controlado({
  inicial = 'presente',
  aoMudar,
}: {
  inicial?: SituacaoPresenca;
  aoMudar?: (v: SituacaoPresenca) => void;
}) {
  const [valor, setValor] = useState<SituacaoPresenca>(inicial);
  return (
    <>
      <SeletorSituacao
        apelido="Alemão"
        valor={valor}
        aoMudar={(v) => {
          setValor(v);
          aoMudar?.(v);
        }}
      />
      <SeletorSituacao apelido="Bigode" valor="presente" aoMudar={() => undefined} />
    </>
  );
}

describe('SeletorSituacao', () => {
  it('radiogroup nomeado com as 4 opções na ordem A, P, L, E', () => {
    render(<Controlado />);
    const grupo = screen.getByRole('radiogroup', { name: 'Situação de Alemão' });
    const radios = Array.from(grupo.querySelectorAll('input')).map((i) => i.value);
    expect(radios).toEqual(['ausente', 'presente', 'lesionado', 'expulso']);
    expect(screen.getAllByRole('radio', { name: /Ausente|Presente|Lesionado|Expulso/ })).toHaveLength(8);
    expect(grupo.querySelectorAll('i[aria-hidden="true"]')).toHaveLength(4);
    expect(Array.from(grupo.querySelectorAll('i')).map((i) => i.textContent)).toEqual(['A', 'P', 'L', 'E']);
    expect(screen.getAllByRole('radio', { name: 'Presente' })[0]).toBeChecked();
  });

  it('clicar em cada opção chama aoMudar com o valor do contrato', async () => {
    const aoMudar = vi.fn();
    render(<Controlado aoMudar={aoMudar} />);
    const grupo = screen.getByRole('radiogroup', { name: 'Situação de Alemão' });
    for (const situacao of SITUACOES_PRESENCA) {
      const opcao = grupo.querySelector<HTMLInputElement>(`input[value="${situacao}"]`)!;
      await userEvent.click(opcao.closest('label')!);
      expect(aoMudar).toHaveBeenLastCalledWith(situacao);
    }
  });

  it('teclado: Tab entra na opção marcada, setas mudam, Tab sai para o próximo jogador', async () => {
    const aoMudar = vi.fn();
    render(<Controlado aoMudar={aoMudar} />);
    await userEvent.tab();
    const grupo = screen.getByRole('radiogroup', { name: 'Situação de Alemão' });
    expect(grupo.querySelector('input[value="presente"]')).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(aoMudar).toHaveBeenLastCalledWith('lesionado');
    await userEvent.keyboard('{ArrowLeft}');
    expect(aoMudar).toHaveBeenLastCalledWith('presente');
    await userEvent.tab();
    const seguinte = screen.getByRole('radiogroup', { name: 'Situação de Bigode' });
    expect(seguinte.contains(document.activeElement)).toBe(true);
  });

  it('o CSS garante alvo de toque mínimo', () => {
    const css = readFileSync(join(import.meta.dirname, 'SeletorSituacao.module.css'), 'utf8');
    expect(css).toContain('min-height: var(--alvo-toque)');
  });

  it('sem violações do axe, numa linha de jogador', async () => {
    const { container } = render(
      <ListaSituacao>
        {partida.jogadores.slice(0, 3).map((j) => (
          <LinhaJogador key={j.id} jogador={j} valor={j.situacao} aoMudar={() => undefined} />
        ))}
      </ListaSituacao>,
    );
    expect(await violacoes(container)).toEqual([]);
  });
});

describe('contarSituacoes', () => {
  it('lista vazia: todos zero, com uma chave por valor do contrato', () => {
    const contagem = contarSituacoes([]);
    expect(Object.keys(contagem).sort()).toEqual([...SITUACOES_PRESENCA].sort());
    expect(Object.values(contagem).every((n) => n === 0)).toBe(true);
  });

  it('conta as marcações', () => {
    const marcacoes: SituacaoPresenca[] = [...Array<SituacaoPresenca>(19).fill('presente'), 'ausente'];
    expect(contarSituacoes(marcacoes)).toEqual({ presente: 19, ausente: 1, lesionado: 0, expulso: 0 });
  });
});

describe('ContagemFixa', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const contagem = (p: number) => ({ presente: p, lesionado: 0, expulso: 0, ausente: 1 });

  it('texto visível na hora; o anúncio muda uma vez, depois que as mudanças param', () => {
    const { rerender, container } = render(<ContagemFixa contagem={contagem(19)} />);
    expect(container).toHaveTextContent('Presentes 19 · Lesionados 0 · Expulsos 0 · Ausentes 1');
    const regiao = container.querySelector('[aria-live="polite"]')!;
    expect(regiao).toHaveAttribute('aria-atomic', 'true');
    for (const p of [18, 17, 16]) {
      rerender(<ContagemFixa contagem={contagem(p)} />);
      act(() => vi.advanceTimersByTime(100));
    }
    expect(container.querySelector('p')).toHaveTextContent('Presentes 16');
    expect(regiao.textContent).toContain('Presentes 19');
    act(() => vi.advanceTimersByTime(800));
    expect(regiao.textContent).toContain('Presentes 16');
  });

  it('desmontar limpa o temporizador', () => {
    const { rerender, unmount } = render(<ContagemFixa contagem={contagem(19)} />);
    rerender(<ContagemFixa contagem={contagem(18)} />);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('sem violações do axe', async () => {
    vi.useRealTimers();
    const { container } = render(<ContagemFixa contagem={contagem(19)} />);
    expect(await violacoes(container)).toEqual([]);
  });
});
