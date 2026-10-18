import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation, useNavigationType } from 'react-router';
import { describe, expect, it } from 'vitest';
import { useMesDaUrl } from './useMesDaUrl';

function montar(url: string) {
  const envoltorio = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={['/anterior', url]} initialIndex={1}>
      {children}
    </MemoryRouter>
  );
  return renderHook(
    () => ({ mes: useMesDaUrl(), local: useLocation(), tipoNavegacao: useNavigationType() }),
    { wrapper: envoltorio },
  );
}

describe('useMesDaUrl', () => {
  it('mês ausente é válido', () => {
    const { result } = montar('/x');
    expect(result.current.mes).toMatchObject({ mesDaUrl: null, mesValido: true });
  });

  it('mês válido é mantido na URL', () => {
    const { result } = montar('/x?mes=2026-10');
    expect(result.current.mes).toMatchObject({ mesDaUrl: '2026-10', mesValido: true });
    expect(result.current.local.search).toBe('?mes=2026-10');
  });

  it('mês malformado é removido da URL, preservando os outros parâmetros', () => {
    const { result } = montar('/x?mes=lixo&a=1');
    expect(result.current.local.search).toBe('?a=1');
    expect(result.current.mes.mesValido).toBe(true);
  });

  it('a remoção substitui a entrada (replace): não cria entrada nova no histórico', () => {
    const { result } = montar('/x?mes=lixo');
    expect(result.current.local.pathname).toBe('/x');
    expect(result.current.local.search).toBe('');
    expect(result.current.tipoNavegacao).toBe('REPLACE');
  });

  it('definirMes grava o mês na URL', () => {
    const { result } = montar('/x');
    act(() => result.current.mes.definirMes('2026-09'));
    expect(result.current.local.search).toBe('?mes=2026-09');
    expect(result.current.mes.mesDaUrl).toBe('2026-09');
  });
});
