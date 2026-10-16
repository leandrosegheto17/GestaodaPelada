import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { violacoes } from '../../../test/apoio/axe';
import * as instalacao from '../../pwa/instalacao';
import * as armazenamento from '../../pwa/armazenamento';
import { AvisoInstalacao } from './AvisoInstalacao';

vi.mock('../../pwa/instalacao', () => ({ lerAmbienteEDecidir: vi.fn() }));
vi.mock('../../pwa/armazenamento', () => ({ avisoInstalacaoFechado: vi.fn(), fecharAvisoInstalacao: vi.fn() }));

const decidir = vi.mocked(instalacao.lerAmbienteEDecidir);
const fechado = vi.mocked(armazenamento.avisoInstalacaoFechado);
const gravar = vi.mocked(armazenamento.fecharAvisoInstalacao);

beforeEach(() => {
  decidir.mockReset().mockReturnValue(true);
  fechado.mockReset().mockResolvedValue(false);
  gravar.mockReset().mockResolvedValue(undefined);
});

const TEXTO = 'Instale: toque em Compartilhar e depois em “Adicionar à Tela de Início”.';

describe('AvisoInstalacao', () => {
  it('sem marca: mostra a faixa com o texto exato e o botão de fechar', async () => {
    render(<AvisoInstalacao />);
    expect(await screen.findByRole('note')).toHaveTextContent(TEXTO);
    expect(screen.getByRole('button', { name: 'Fechar aviso de instalação' })).toBeInTheDocument();
  });

  it('fechar some na hora, grava a marca e leva o foco ao conteúdo', async () => {
    render(
      <>
        <AvisoInstalacao />
        <main id="conteudo" tabIndex={-1} />
      </>,
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Fechar aviso de instalação' }));
    expect(screen.queryByRole('note')).toBeNull();
    expect(gravar).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('main')).toHaveFocus();
  });

  it('falha ao gravar a marca: some mesmo assim', async () => {
    gravar.mockRejectedValue(new Error('cheio'));
    render(<AvisoInstalacao />);
    await userEvent.click(await screen.findByRole('button', { name: 'Fechar aviso de instalação' }));
    expect(screen.queryByRole('note')).toBeNull();
  });

  it('com a marca gravada não aparece', async () => {
    fechado.mockResolvedValue(true);
    render(<AvisoInstalacao />);
    await waitFor(() => expect(fechado).toHaveBeenCalled());
    expect(screen.queryByRole('note')).toBeNull();
  });

  it('detecção falsa não aparece nem consulta o armazenamento', () => {
    decidir.mockReturnValue(false);
    render(<AvisoInstalacao />);
    expect(screen.queryByRole('note')).toBeNull();
    expect(fechado).not.toHaveBeenCalled();
  });

  it('sem violações do axe', async () => {
    const { container } = render(<AvisoInstalacao />);
    await screen.findByRole('note');
    expect(await violacoes(container)).toEqual([]);
  });
});
