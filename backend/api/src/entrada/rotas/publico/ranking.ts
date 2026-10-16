import { CODIGOS_ERRO, rankingPublicoConsulta } from '@pelada/contrato';
import { Hono } from 'hono';
import { buscarGrupoPublico } from '../../../aplicacao/publico/grupo-por-slug.js';
import { montarRankingPublico } from '../../../aplicacao/publico/ranking.js';
import type { AppEnv } from '../../app.js';
import { corpoErro, naoEncontrado, responderValidacao } from '../../erros.js';

/** `GET /api/publico/:slug/ranking?mes=`: ranking público (projeção estrita); sem login. */
export const rotaPublicoRanking = new Hono<AppEnv>().get('/api/publico/:slug/ranking', async (c) => {
  const consulta = rankingPublicoConsulta.safeParse(c.req.query());
  if (!consulta.success) return responderValidacao(c, consulta.error);
  const db = c.var.db();
  const grupo = await buscarGrupoPublico(db, c.req.param('slug'));
  if (!grupo) return naoEncontrado(c);

  const resultado = await montarRankingPublico(db, grupo, {
    hoje: c.var.relogio.hoje(),
    mes: consulta.data.mes ?? c.var.relogio.mes(),
    agora: new Date(c.var.relogio.agoraIso()),
    enderecoNovo: c.var.config.enderecoNovo,
  });
  if (resultado.tipo === 'fora_dos_limites') {
    return c.json(
      corpoErro(CODIGOS_ERRO.validacao, 'Corrija os campos indicados.', { mes: 'Mês fora do histórico do grupo.' }),
      422,
    );
  }
  return c.json(resultado.ranking);
});
