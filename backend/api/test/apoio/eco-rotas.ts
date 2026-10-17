import { clienteTeste } from './cliente.js';
import { relogioFixo } from './relogio.js';

/** Cliente de teste com rotas de eco atrás dos middlewares de grupo, financeiro e dono. */
export function comEco(cookie?: string) {
  const c = clienteTeste({ relogio: relogioFixo('2026-10-16'), ...(cookie ? { cookie } : {}) });
  c.app.get('/api/grupos/:grupoId/eco', (ctx) => ctx.json({ ok: true }));
  c.app.post('/api/grupos/:grupoId/eco', (ctx) => ctx.json({ ok: true }));
  c.app.get('/api/grupos/:grupoId/financeiro/eco', (ctx) => ctx.json({ ok: true }));
  c.app.get('/api/dono/eco', (ctx) => ctx.json({ ok: true }));
  return c;
}
