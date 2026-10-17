import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { violacoes } from '../../../test/apoio/axe';
import {
  Cartao,
  ConteudoPagina,
  DuasColunas,
  FerramentasLista,
  Formulario,
  GrupoBotoes,
  Paragrafo,
  Secao,
  Subtitulo,
  TituloPagina,
  Voltar,
} from './index';

describe('componentes de página', () => {
  it('cada um renderiza a tag certa com o texto e sem violação de acessibilidade', async () => {
    const { container } = render(
      <MemoryRouter>
        <ConteudoPagina>
          <TituloPagina>Título</TituloPagina>
          <Subtitulo>Sub</Subtitulo>
          <Paragrafo>Texto</Paragrafo>
          <Secao>
            <Cartao>Dentro</Cartao>
            <DuasColunas>
              <span>a</span>
              <span>b</span>
            </DuasColunas>
            <FerramentasLista>
              <span>filtro</span>
            </FerramentasLista>
            <GrupoBotoes>
              <button type="button">Ok</button>
            </GrupoBotoes>
          </Secao>
          <Formulario aoEnviar={() => undefined}>
            <span>campo</span>
          </Formulario>
        </ConteudoPagina>
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Título' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Sub' })).toBeInTheDocument();
    expect(screen.getByText('Texto').tagName).toBe('P');
    expect(screen.getByText('Dentro').closest('div')).not.toBeNull();
    expect(container.querySelector('section')).not.toBeNull();
    expect(container.querySelector('form')).toHaveAttribute('novalidate');
    expect(await violacoes(container)).toEqual([]);
  });

  it('ConteudoPagina aplica a variação estreita só quando pedida', () => {
    const { container, rerender } = render(<ConteudoPagina>x</ConteudoPagina>);
    const largo = (container.firstElementChild as HTMLElement).className;
    rerender(<ConteudoPagina estreito>x</ConteudoPagina>);
    expect((container.firstElementChild as HTMLElement).className).not.toBe(largo);
    expect((container.firstElementChild as HTMLElement).className).toContain(largo);
  });

  it('Voltar com `para` é link; com `aoClicar` é botão acionável por teclado', async () => {
    const aoClicar = vi.fn();
    const { container } = render(
      <MemoryRouter>
        <Voltar para="/ranking" rotulo="Voltar ao ranking" />
        <Voltar rotulo="Voltar" aoClicar={aoClicar} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Voltar ao ranking' })).toHaveAttribute('href', '/ranking');
    const botao = screen.getByRole('button', { name: 'Voltar' });
    botao.focus();
    await userEvent.keyboard('{Enter}');
    expect(aoClicar).toHaveBeenCalledTimes(1);
    expect(await violacoes(container)).toEqual([]);
  });
});
