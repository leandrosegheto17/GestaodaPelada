import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, Link, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { violacoes } from '../../../test/apoio/axe';
import { Component as PaginaPrivacidade } from './PaginaPrivacidade';

function montar(entradas: string[], indice?: number) {
  const roteador = createMemoryRouter(
    [
      { path: '/privacidade', Component: PaginaPrivacidade },
      { path: '/g/:slug', element: <Link to="/privacidade">Privacidade</Link> },
      { path: '/', element: <p>Página inicial</p> },
    ],
    { initialEntries: entradas, ...(indice === undefined ? {} : { initialIndex: indice }) },
  );
  const { container } = render(<RouterProvider router={roteador} />);
  return { container, roteador };
}

describe('PaginaPrivacidade (T07)', () => {
  it('título e os três blocos, na ordem do aviso', () => {
    montar(['/privacidade']);
    expect(screen.getByRole('heading', { level: 1, name: 'Privacidade' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'O que guardamos',
      'Quem vê',
      'Como pedir a exclusão',
    ]);
    expect(screen.getByText('Gestão da Pelada')).toBeInTheDocument();
  });

  it('o bloco "Quem vê" fala em colocação, nunca em posição', () => {
    montar(['/privacidade']);
    const bloco = screen.getByRole('heading', { name: 'Quem vê' }).nextElementSibling;
    expect(bloco).toHaveTextContent('apelido, colocação e pontos');
    expect(bloco?.textContent).not.toMatch(/posição no ranking/i);
    expect(bloco).toHaveTextContent('Telefone, idade, posição em campo, notas, nível e o caixa ficam só com os admins');
  });

  it('aberta direto (sem tela anterior): Voltar leva ao início', async () => {
    montar(['/privacidade']);
    expect(screen.getByRole('link', { name: 'Voltar' })).toHaveAttribute('href', '/');
    await userEvent.click(screen.getByRole('link', { name: 'Voltar' }));
    expect(await screen.findByText('Página inicial')).toBeInTheDocument();
  });

  it('veio de outra tela: Voltar retorna a ela, no histórico', async () => {
    montar(['/g/quinta', '/privacidade'], 1);
    await userEvent.click(screen.getByRole('link', { name: 'Voltar' }));
    expect(await screen.findByRole('link', { name: 'Privacidade' })).toBeInTheDocument();
  });

  it('axe: sem violações', async () => {
    const { container } = montar(['/privacidade']);
    expect(await violacoes(container)).toEqual([]);
  });
});
