import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { violacoes } from '../../../test/apoio/axe';
import * as armazenamento from '../../pwa/armazenamento';
import { carregarEntrada } from '../entrada/carregarEntrada';
import { Component as SemGrupo } from './SemGrupo';

vi.mock('../../pwa/armazenamento', () => ({ grupoLembrado: vi.fn() }));

const lembrado = vi.mocked(armazenamento.grupoLembrado);
beforeEach(() => lembrado.mockReset());

function montar() {
  const roteador = createMemoryRouter(
    [
      { path: '/', loader: carregarEntrada, Component: SemGrupo },
      { path: '/g/:slug', element: <p>Ranking do grupo</p> },
      { path: '/entrar', element: <p>Tela de entrada</p> },
    ],
    { initialEntries: ['/'] },
  );
  const { container } = render(<RouterProvider router={roteador} />);
  return { roteador, container };
}

describe('SemGrupo (T02)', () => {
  it('textos exatos, link para a entrada e um único h1', async () => {
    lembrado.mockResolvedValue(null);
    montar();
    expect(await screen.findByRole('heading', { level: 1, name: 'Abra o link do seu grupo' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByText('Gestão da Pelada')).toBeInTheDocument();
    expect(screen.getByText('Peça o link do ranking ao admin do seu grupo de pelada.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Já tenho login de admin' })).toHaveAttribute('href', '/entrar');
    await waitFor(() => expect(document.title).toBe('Abra o link do seu grupo'));
  });

  it('com grupo lembrado, vai direto ao ranking', async () => {
    lembrado.mockResolvedValue('pelada-de-quinta');
    const { roteador } = montar();
    expect(await screen.findByText('Ranking do grupo')).toBeInTheDocument();
    expect(roteador.state.location.pathname).toBe('/g/pelada-de-quinta');
  });

  it('sem violações do axe', async () => {
    lembrado.mockResolvedValue(null);
    const { container } = montar();
    await screen.findByRole('heading', { level: 1 });
    expect(await violacoes(container)).toEqual([]);
  });
});
