import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { violacoes } from '../../../test/apoio/axe';
import { DialogoConfirmacao, DialogoSenha } from './index';

describe('DialogoConfirmacao (D2)', () => {
  it('foco em Cancelar, verbo no botão destrutivo, confirmar e cancelar', async () => {
    const aoConfirmar = vi.fn();
    const aoCancelar = vi.fn();
    render(
      <DialogoConfirmacao
        titulo="Excluir?"
        texto="Sem volta."
        verbo="Excluir partida"
        aoConfirmar={aoConfirmar}
        aoCancelar={aoCancelar}
      />,
    );
    expect(screen.getByRole('alertdialog', { name: 'Excluir?' })).toHaveAccessibleDescription('Sem volta.');
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus();
    await userEvent.click(screen.getByRole('button', { name: 'Excluir partida' }));
    expect(aoConfirmar).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(aoCancelar).toHaveBeenCalledTimes(1);
  });

  it('Esc equivale a Cancelar', async () => {
    const aoCancelar = vi.fn();
    render(
      <DialogoConfirmacao titulo="X?" texto="y" verbo="Apagar" aoConfirmar={() => undefined} aoCancelar={aoCancelar} />,
    );
    await userEvent.keyboard('{Escape}');
    expect(aoCancelar).toHaveBeenCalledTimes(1);
  });

  it('carregando mantém o rótulo e não confirma', async () => {
    const aoConfirmar = vi.fn();
    render(
      <DialogoConfirmacao
        titulo="X?"
        texto="y"
        verbo="Apagar"
        aoConfirmar={aoConfirmar}
        aoCancelar={() => undefined}
        carregando
      />,
    );
    const botao = screen.getByRole('button', { name: 'Apagar' });
    expect(botao).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(botao);
    expect(aoConfirmar).not.toHaveBeenCalled();
  });

  it('por digitação: só habilita com o nome exato (espaços nas pontas aceitos)', async () => {
    render(
      <DialogoConfirmacao
        titulo="Arquivar?"
        texto="y"
        verbo="Arquivar grupo"
        aoConfirmar={() => undefined}
        aoCancelar={() => undefined}
        confirmarDigitando={{ nome: 'Pelada de Quinta' }}
      />,
    );
    const botao = screen.getByRole('button', { name: 'Arquivar grupo' });
    const campo = screen.getByLabelText('Digite o nome do grupo para confirmar');
    expect(campo).toHaveAttribute('autocomplete', 'off');
    expect(botao).toBeDisabled();
    for (const [texto, habilitado] of [
      ['Pelada de', false],
      ['pelada de quinta', false],
      ['Pelada de Quinta ', true],
      ['Pelada de Quinta', true],
    ] as const) {
      await userEvent.clear(campo);
      await userEvent.type(campo, texto);
      if (habilitado) expect(botao).toBeEnabled();
      else expect(botao).toBeDisabled();
    }
  });

  it('sem violações do axe, inclusive com o botão desabilitado', async () => {
    render(
      <DialogoConfirmacao
        titulo="Arquivar?"
        texto="y"
        verbo="Arquivar grupo"
        aoConfirmar={() => undefined}
        aoCancelar={() => undefined}
        confirmarDigitando={{ nome: 'Grupo' }}
      />,
    );
    expect(await violacoes(screen.getByRole('alertdialog'))).toEqual([]);
  });
});

describe('DialogoSenha (D1)', () => {
  const SENHA = 'Hx7nRq4tWp2m';
  let escrever: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    escrever = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: escrever }, configurable: true });
  });
  afterEach(() => vi.restoreAllMocks());

  it('foco em Copiar; a senha é texto no DOM, não um campo', () => {
    render(<DialogoSenha nome="Rodrigo" senha={SENHA} aoFechar={() => undefined} />);
    expect(screen.getByRole('dialog', { name: 'Senha temporária de Rodrigo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copiar' })).toHaveFocus();
    expect(screen.getByText(SENHA).tagName).toBe('SPAN');
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('Copiar escreve a senha e anuncia "Senha copiada"', async () => {
    render(<DialogoSenha nome="Rodrigo" senha={SENHA} aoFechar={() => undefined} />);
    await userEvent.click(screen.getByRole('button', { name: 'Copiar' }));
    expect(escrever).toHaveBeenCalledWith(SENHA);
    expect(await screen.findByRole('status')).toHaveTextContent('Senha copiada');
  });

  it('falha ao copiar anuncia a mensagem de falha', async () => {
    escrever.mockRejectedValue(new Error('negado'));
    render(<DialogoSenha nome="Rodrigo" senha={SENHA} aoFechar={() => undefined} />);
    await userEvent.click(screen.getByRole('button', { name: 'Copiar' }));
    expect(await screen.findByText('Não foi possível copiar. Selecione a senha e copie.')).toBeInTheDocument();
  });

  it('"Já copiei" fecha direto', async () => {
    const aoFechar = vi.fn();
    render(<DialogoSenha nome="Rodrigo" senha={SENHA} aoFechar={aoFechar} />);
    await userEvent.click(screen.getByRole('button', { name: 'Já copiei' }));
    expect(aoFechar).toHaveBeenCalledTimes(1);
  });

  it.each(['clique no X', 'Esc'])('%s pede confirmação; Voltar mantém a senha; Fechar confirma', async (como) => {
    const aoFechar = vi.fn();
    render(<DialogoSenha nome="Rodrigo" senha={SENHA} aoFechar={aoFechar} />);
    if (como === 'Esc') await userEvent.keyboard('{Escape}');
    else await userEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(screen.getByRole('alertdialog', { name: 'Fechar sem copiar?' })).toBeInTheDocument();
    expect(aoFechar).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(screen.getByText(SENHA)).toBeInTheDocument();
    if (como === 'Esc') await userEvent.keyboard('{Escape}');
    else await userEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(aoFechar).toHaveBeenCalledTimes(1);
  });

  it('não grava em armazenamento e some do DOM ao desmontar', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const abrir = vi.fn();
    vi.stubGlobal('indexedDB', { open: abrir });
    const { unmount } = render(<DialogoSenha nome="Rodrigo" senha={SENHA} aoFechar={() => undefined} />);
    expect(document.body).toHaveTextContent(SENHA);
    expect(setItem).not.toHaveBeenCalled();
    expect(abrir).not.toHaveBeenCalled();
    unmount();
    expect(setItem).not.toHaveBeenCalled();
    expect(abrir).not.toHaveBeenCalled();
    expect(document.body).not.toHaveTextContent(SENHA);
    vi.unstubAllGlobals();
  });

  it('a senha fica num contêiner de classe monoespaçada', () => {
    render(<DialogoSenha nome="Rodrigo" senha={SENHA} aoFechar={() => undefined} />);
    expect(screen.getByText(SENHA).parentElement?.className).toMatch(/senha/);
  });

  it('sem violações do axe', async () => {
    render(<DialogoSenha nome="Rodrigo" senha={SENHA} aoFechar={() => undefined} />);
    expect(await violacoes(screen.getByRole('dialog'))).toEqual([]);
  });
});
