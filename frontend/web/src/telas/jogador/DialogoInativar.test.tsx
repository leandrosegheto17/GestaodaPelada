import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { violacoes } from '../../../test/apoio/axe';
import { ErroApi } from '../../dados/erros';
import { DialogoInativar } from './DialogoInativar';

const HOJE = '2026-10-22';
const MENSAGEM = 'A data de saída não pode ser antes do início da pontuação (01/09/2026).';

function montar(erro: unknown = null) {
  const aoInativar = vi.fn();
  const props = { apelido: 'Toninho', hoje: HOJE, enviando: false, aoInativar, aoCancelar: vi.fn() };
  const { rerender } = render(<DialogoInativar {...props} erro={erro} />);
  const dialogo = screen.getByRole('dialog', { name: 'Inativar Toninho' });
  const campo = within(dialogo).getByLabelText('Data de saída');
  const reenviar = (novo: unknown) => rerender(<DialogoInativar {...props} erro={novo} />);
  return { aoInativar, dialogo, campo, reenviar };
}

const recusa = () =>
  new ErroApi(422, {
    erro: { codigo: 'validacao', mensagem: 'Corrija os campos indicados.', campos: { dataSaida: MENSAGEM } },
  });

describe('DialogoInativar', () => {
  it('data futura é recusada pelo esquema local, sem chamar a API', async () => {
    const { aoInativar, campo, dialogo } = montar();
    fireEvent.change(campo, { target: { value: '2026-10-23' } });
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Inativar' }));
    expect(await within(dialogo).findByRole('alert')).toHaveTextContent('A data não pode ser no futuro.');
    expect(aoInativar).not.toHaveBeenCalled();
  });

  it('422 da API aparece no campo "Data de saída" com a mensagem literal, foco e axe', async () => {
    const { aoInativar, campo, dialogo, reenviar } = montar();
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Inativar' }));
    expect(aoInativar).toHaveBeenCalledWith(HOJE);
    reenviar(recusa());
    expect(await within(dialogo).findByRole('alert')).toHaveTextContent(MENSAGEM);
    expect(campo).toBeInvalid();
    expect(campo).toHaveAccessibleDescription(MENSAGEM);
    expect(campo).toHaveFocus();
    expect(within(dialogo).queryByText(/Verifique a conexão/)).toBeNull();
    expect(await violacoes(dialogo)).toEqual([]);
  });

  it('trocar a data limpa a recusa', async () => {
    const { campo, dialogo, reenviar } = montar();
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Inativar' }));
    reenviar(recusa());
    await within(dialogo).findByText(MENSAGEM);
    fireEvent.change(campo, { target: { value: '2026-10-20' } });
    expect(within(dialogo).queryByText(MENSAGEM)).toBeNull();
  });

  it('erro sem campo (rede) vira alerta de conexão, distinto do 422', async () => {
    const { campo, dialogo } = montar(new TypeError('Failed to fetch'));
    expect(await within(dialogo).findByRole('alert')).toHaveTextContent(
      'Não foi possível inativar. Verifique a conexão e tente de novo.',
    );
    expect(campo).not.toBeInvalid();
  });
});
