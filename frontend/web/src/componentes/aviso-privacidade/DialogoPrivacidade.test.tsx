import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { violacoes } from '../../../test/apoio/axe';
import { DialogoPrivacidade } from './DialogoPrivacidade';

function montar(propriedades: { enviando?: boolean; erro?: boolean; aoEntender?: () => void } = {}) {
  const aoEntender = propriedades.aoEntender ?? vi.fn();
  render(
    <MemoryRouter>
      <DialogoPrivacidade
        aoEntender={aoEntender}
        enviando={propriedades.enviando ?? false}
        erro={propriedades.erro ?? false}
      />
    </MemoryRouter>,
  );
  return { aoEntender };
}

describe('DialogoPrivacidade', () => {
  it('é um diálogo chamado "Privacidade" com os três avisos', () => {
    montar();
    const dialogo = screen.getByRole('dialog', { name: 'Privacidade' });
    expect(dialogo).toHaveTextContent('O que guardamos: dados de cadastro dos jogadores e dos admins');
    expect(dialogo).toHaveTextContent('Quem vê: o público vê apelido, colocação e pontos');
    expect(dialogo).toHaveTextContent('Exclusão: o jogador pede ao admin do grupo.');
    expect(screen.getByRole('link', { name: 'Ler o aviso completo' })).toHaveAttribute('href', '/privacidade');
  });

  it('o foco inicial está no título; Tab circula entre o link e "Entendi"', async () => {
    montar();
    expect(screen.getByRole('heading', { name: 'Privacidade' })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('link', { name: 'Ler o aviso completo' })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Entendi' })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('link', { name: 'Ler o aviso completo' })).toHaveFocus();
  });

  it('Esc não fecha: o aviso só some com "Entendi"', async () => {
    const { aoEntender } = montar();
    await userEvent.keyboard('{Escape}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(aoEntender).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Entendi' }));
    expect(aoEntender).toHaveBeenCalledTimes(1);
  });

  it('falha ao marcar: aviso de erro dentro do diálogo', () => {
    montar({ erro: true });
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível enviar. Verifique a conexão.');
  });

  it('axe: sem violações', async () => {
    montar();
    expect(await violacoes(document.body)).toEqual([]);
  });
});
