import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { violacoes } from '../../test/apoio/axe';
import { FaixaNovaVersao } from './FaixaNovaVersao';

const atualizar = vi.fn();
let precisaAtualizar = false;

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [precisaAtualizar, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: atualizar,
  }),
}));

beforeEach(() => {
  atualizar.mockReset();
  precisaAtualizar = false;
});

describe('FaixaNovaVersao', () => {
  it('sem versão nova, não mostra nada', () => {
    const { container } = render(<FaixaNovaVersao />);
    expect(container).toBeEmptyDOMElement();
  });

  it('com versão nova, mostra o aviso e Recarregar chama updateServiceWorker(true)', async () => {
    precisaAtualizar = true;
    render(<FaixaNovaVersao />);
    expect(screen.getByRole('status')).toHaveTextContent('Nova versão.');
    await userEvent.click(screen.getByRole('button', { name: 'Recarregar' }));
    expect(atualizar).toHaveBeenCalledWith(true);
  });

  it('sem violações do axe', async () => {
    precisaAtualizar = true;
    const { container } = render(<FaixaNovaVersao />);
    expect(await violacoes(container)).toEqual([]);
  });
});
