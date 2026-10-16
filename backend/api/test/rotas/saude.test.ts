import { describe, expect, it } from 'vitest';
import { clienteTeste } from '../apoio/cliente.js';

describe('GET /api/saude (workerd)', () => {
  it('responde 200 sem cache', async () => {
    const r = await clienteTeste().get('/api/saude');
    expect(r.status).toBe(200);
    expect(r.headers.get('Cache-Control')).toBe('no-store');
  });

  it('escrita sem X-Pelada recebe 403', async () => {
    const r = await clienteTeste({ semCsrf: true }).post('/api/saude');
    expect(r.status).toBe(403);
  });
});
