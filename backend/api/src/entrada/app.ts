import { LIMITES } from '@pelada/contrato';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import type { SessaoAtual } from '../aplicacao/acesso/sessao.js';
import type { VinculoAtual } from '../aplicacao/acesso/vinculo.js';
import { lerConfig, ConfigInvalida, type Config, type Env } from '../config/index.js';
import { criarDb, fecharDb, type Db } from '../infraestrutura/db/index.js';
import { criarRelogio, type Relogio } from '../infraestrutura/relogio/index.js';
import { corpoGrande, erroInterno, naoEncontrado } from './erros.js';
import { semCache } from './middlewares/cache.js';
import { exigirCabecalhoPelada } from './middlewares/csrf.js';
import { criarLimiteTaxa, type Limitador } from './middlewares/limite-taxa.js';
import { exigirDono } from './middlewares/dono.js';
import { exigirFinanceiro, exigirVinculo } from './middlewares/grupo.js';
import { carregarSessao } from './middlewares/sessao.js';
import { ROTAS } from './registro-rotas.js';

export interface Variaveis {
  relogio: Relogio;
  config: Config;
  /** Conexão da requisição, aberta na primeira chamada e fechada ao fim (`waitUntil`). */
  db: () => Db;
  sessao: SessaoAtual | null;
  /** Vínculo da conta com o grupo da rota (só dentro de `/api/grupos/:grupoId`). */
  vinculo?: VinculoAtual;
}

export type AppEnv = { Bindings: Env; Variables: Variaveis };

export interface OpcoesApp {
  /** Substitui o relógio (testes). */
  relogio?: Relogio;
  /** Substitui os limitadores de taxa do ambiente (testes). */
  limitadores?: { entrar?: Limitador; publico?: Limitador };
}

/** Monta o app Hono. É uma fábrica: nada é guardado entre requisições. */
export function criarApp(opcoes: OpcoesApp = {}): Hono<AppEnv> {
  const app = new Hono<AppEnv>();
  const relogio = opcoes.relogio ?? criarRelogio();

  app.use('/api/*', semCache);
  app.use(
    '/api/sessao/entrar',
    criarLimiteTaxa((c) => opcoes.limitadores?.entrar ?? c.env?.LIMITE_ENTRAR),
  );
  app.use(
    '/api/publico/*',
    criarLimiteTaxa((c) => opcoes.limitadores?.publico ?? c.env?.LIMITE_PUBLICO),
  );
  app.use('/api/*', exigirCabecalhoPelada);
  app.use('/api/*', bodyLimit({ maxSize: LIMITES.corpoBytes, onError: (c) => corpoGrande(c) }));
  app.use('/api/*', async (c, proximo) => {
    c.set('relogio', relogio);
    c.set('config', lerConfig(c.env));
    let conexao: Db | null = null;
    c.set('db', () => (conexao ??= criarDb(c.env.HYPERDRIVE, c.executionCtx)));
    try {
      await proximo();
    } finally {
      if (conexao) c.executionCtx.waitUntil(fecharDb(conexao));
    }
  });
  app.use('/api/*', carregarSessao);

  // Rotas de negócio só entram depois destes middlewares (ADR-005).
  app.use('/api/grupos/:grupoId', exigirVinculo);
  app.use('/api/grupos/:grupoId/*', exigirVinculo);
  app.use('/api/grupos/:grupoId/financeiro', exigirFinanceiro);
  app.use('/api/grupos/:grupoId/financeiro/*', exigirFinanceiro);
  app.use('/api/dono/*', exigirDono);

  app.get('/api/saude', (c) => c.json({ ok: true }));
  for (const rota of ROTAS) app.route('/', rota);

  app.notFound((c) => naoEncontrado(c));
  app.onError((erro, c) => {
    // Só o nome do erro vai para o log: nunca a mensagem, o valor de configuração nem a pilha.
    console.error(erro instanceof ConfigInvalida ? erro.message : `erro: ${erro.name}`);
    return erroInterno(c);
  });

  return app;
}
