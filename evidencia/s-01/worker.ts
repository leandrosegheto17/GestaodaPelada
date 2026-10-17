// @ts-nocheck
/* eslint-disable */
// Worker de prova do SPK-0001 (S-01): transação interativa com `pg` sobre o Hyperdrive.
// Descartável: roda só com `wrangler dev --remote` e usa o `emTransacao` do app.
import { criarDb, fecharDb } from '../../backend/api/src/infraestrutura/db/cliente.js';
import { emTransacao } from '../../backend/api/src/infraestrutura/db/transacao.js';
import { kyselyDe } from '../../backend/api/src/infraestrutura/db/cliente.js';

const TABELA = 'spike_s01';

async function comDb(env, ctx, fn) {
  const db = criarDb({ connectionString: env.HYPERDRIVE.connectionString }, ctx);
  try {
    return await fn(db);
  } finally {
    await fecharDb(db);
  }
}

const contar = (db, marcador) =>
  kyselyDe(db)
    .selectFrom(TABELA)
    .select((eb) => eb.fn.countAll().as('n'))
    .where('marcador', '=', marcador)
    .executeTakeFirstOrThrow()
    .then((r) => Number(r.n));

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const m = url.searchParams.get('m') ?? crypto.randomUUID();
    try {
      // Caso 1: COMMIT visível para outra conexão.
      if (url.pathname === '/commit') {
        await comDb(env, ctx, (db) =>
          emTransacao(db, (tx) => kyselyDe(tx).insertInto(TABELA).values({ marcador: m }).execute()),
        );
        const n = await comDb(env, ctx, (db) => contar(db, m));
        return Response.json({ ok: n === 1, linhas: n });
      }
      // Caso 2: erro no meio -> ROLLBACK, nada fica; o erro original sobe.
      if (url.pathname === '/rollback') {
        let erro = null;
        await comDb(env, ctx, (db) =>
          emTransacao(db, async (tx) => {
            await kyselyDe(tx).insertInto(TABELA).values({ marcador: m }).execute();
            await kyselyDe(tx).insertInto(TABELA).values({ marcador: m }).execute();
            throw new Error('falha-de-proposito');
          }),
        ).catch((e) => (erro = e.message));
        const n = await comDb(env, ctx, (db) => contar(db, m));
        return Response.json({ ok: n === 0 && erro === 'falha-de-proposito', linhas: n, erro });
      }
      // Caso 3 (uma transação; o runner dispara 50 em série e 20 em paralelo).
      if (url.pathname === '/tx') {
        await comDb(env, ctx, (db) =>
          emTransacao(db, (tx) => kyselyDe(tx).insertInto(TABELA).values({ marcador: m }).execute()),
        );
        return Response.json({ ok: true });
      }
      if (url.pathname === '/contar') {
        const n = await comDb(env, ctx, (db) => contar(db, m));
        return Response.json({ linhas: n });
      }
      return new Response('rotas: /commit /rollback /tx /contar', { status: 404 });
    } catch (e) {
      return Response.json({ ok: false, erro: String(e?.message ?? e) }, { status: 500 });
    }
  },
};
