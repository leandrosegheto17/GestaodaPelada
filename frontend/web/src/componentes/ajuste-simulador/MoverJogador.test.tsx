import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { violacoes } from '../../../test/apoio/axe';
import { MoverJogador } from './MoverJogador';
import { TrocarCom } from './TrocarCom';

describe('MoverJogador (2 times)', () => {
  const montar = (extra: Partial<Parameters<typeof MoverJogador>[0]> = {}) => {
    const aoEscolher = vi.fn();
    const aoTrocar = vi.fn();
    const aoFechar = vi.fn();
    const aoAlternarSo1oTempo = vi.fn();
    render(
      <MoverJogador
        formato="dois_times"
        apelido="Japa"
        nomesDosTimes={['Time A', 'Time B']}
        atual={{ lugar: 'entra', time: 0 }}
        so1oTempo={false}
        aoEscolher={aoEscolher}
        aoTrocar={aoTrocar}
        aoFechar={aoFechar}
        aoAlternarSo1oTempo={aoAlternarSo1oTempo}
        {...(extra as object)}
      />,
    );
    return { aoEscolher, aoTrocar, aoFechar, aoAlternarSo1oTempo };
  };

  it('lista os destinos na ordem do mockup, com o atual marcado', () => {
    montar();
    const dialogo = screen.getByRole('dialog', { name: 'Japa' });
    const rotulos = within(dialogo)
      .getAllByRole('button')
      .map((b) => b.textContent?.replace(/atual$/, ' atual').trim());
    expect(rotulos).toEqual([
      'Titular do Time A',
      'Titular do Time B',
      'Entra no 2º tempo pelo Time A atual',
      'Entra no 2º tempo pelo Time B',
      'Não entra',
      'Trocar com…',
    ]);
    expect(screen.getByRole('button', { name: /Entra no 2º tempo pelo Time A/ })).toHaveAttribute(
      'aria-current',
      'true',
    );
  });

  it('escolher um destino avisa e fecha; "Trocar com…" abre a troca', async () => {
    const { aoEscolher, aoFechar, aoTrocar } = montar();
    await userEvent.click(screen.getByRole('button', { name: 'Titular do Time B' }));
    expect(aoEscolher).toHaveBeenCalledWith({ lugar: 'titular', time: 1 });
    expect(aoFechar).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Trocar com…' }));
    expect(aoTrocar).toHaveBeenCalled();
  });

  it('"Só 1º tempo" é um interruptor com estado Não/Sim', async () => {
    const { aoAlternarSo1oTempo } = montar();
    const chave = screen.getByRole('switch', { name: 'Só 1º tempo' });
    expect(chave).not.toBeChecked();
    await userEvent.click(chave);
    expect(aoAlternarSo1oTempo).toHaveBeenCalledWith(true);
  });

  it('Esc fecha', async () => {
    const { aoFechar } = montar();
    await userEvent.keyboard('{Escape}');
    expect(aoFechar).toHaveBeenCalled();
  });

  it('axe: sem violações', async () => {
    montar();
    expect(await violacoes(document.body)).toEqual([]);
  });
});

describe('MoverJogador (3 ou mais times)', () => {
  it('"Time 1" atual e "Mover para Time N" nos outros; sem interruptor', async () => {
    const aoEscolher = vi.fn();
    render(
      <MoverJogador
        formato="varios_times"
        apelido="Toninho"
        nomesDosTimes={['Time 1', 'Time 2', 'Time 3', 'Time 4', 'Time 5']}
        atual={{ time: 0 }}
        aoEscolher={aoEscolher}
        aoTrocar={() => undefined}
        aoFechar={() => undefined}
      />,
    );
    expect(screen.getByRole('button', { name: /^Time 1/ })).toHaveAttribute('aria-current', 'true');
    expect(screen.getAllByRole('button', { name: /^Mover para Time/ })).toHaveLength(4);
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Mover para Time 2' }));
    expect(aoEscolher).toHaveBeenCalledWith({ time: 1 });
  });
});

describe('TrocarCom', () => {
  it('lista os outros por grupo, escolhe um e permite voltar', async () => {
    const aoEscolher = vi.fn();
    const aoVoltar = vi.fn();
    render(
      <TrocarCom
        apelido="Japa"
        grupos={[
          { titulo: 'Time A · Titulares', jogadores: [{ id: 'a', apelido: 'Toninho' }] },
          { titulo: 'Time B · Titulares', jogadores: [] },
        ]}
        aoEscolher={aoEscolher}
        aoVoltar={aoVoltar}
        aoFechar={() => undefined}
      />,
    );
    expect(screen.getByRole('dialog', { name: 'Trocar Japa com…' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Time A · Titulares' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Time B · Titulares' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Toninho' }));
    expect(aoEscolher).toHaveBeenCalledWith('a');
    await userEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(aoVoltar).toHaveBeenCalled();
  });
});
