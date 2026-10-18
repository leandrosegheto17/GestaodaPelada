import pg from 'pg';
import { vi } from 'vitest';

/** Conta as consultas SQL enviadas ao banco enquanto `fn` roda (qualquer conexão `pg`). */
export async function contarConsultas(fn: () => Promise<unknown>): Promise<number> {
  const espiao = vi.spyOn(pg.Client.prototype, 'query');
  try {
    await fn();
    return espiao.mock.calls.length;
  } finally {
    espiao.mockRestore();
  }
}
