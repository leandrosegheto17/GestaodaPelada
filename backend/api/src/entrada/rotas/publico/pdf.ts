import { CODIGOS_ERRO, pdfConsulta } from '@pelada/contrato';
import { Hono } from 'hono';
import { buscarGrupoPublico } from '../../../aplicacao/publico/grupo-por-slug.js';
import { montarProjecaoPdf } from '../../../aplicacao/publico/pdf.js';
import type { AppEnv } from '../../app.js';
import { corpoErro, naoEncontrado, responderValidacao } from '../../erros.js';

/** `GET /api/publico/:slug/pdf?mes=`: dados do PDF do ranking (projeção estrita); sem login. */
export const rotaPublicoPdf = new Hono<AppEnv>().get('/api/publico/:slug/pdf', async (c) => {
  const consulta = pdfConsulta.safeParse(c.req.query());
  if (!consulta.success) return responderValidacao(c, consulta.error);
  const db = c.var.db();
  const grupo = await buscarGrupoPublico(db, c.req.param('slug'));
  if (!grupo) return naoEncontrado(c);

  const resultado = await montarProjecaoPdf(db, grupo, {
    hoje: c.var.relogio.hoje(),
    mes: consulta.data.mes ?? c.var.relogio.mes(),
    agora: new Date(c.var.relogio.agoraIso()),
    urlPublica: c.var.config.urlPublica,
  });
  if (resultado.tipo === 'fora_dos_limites') {
    return c.json(
      corpoErro(CODIGOS_ERRO.validacao, 'Corrija os campos indicados.', { mes: 'Mês fora do histórico do grupo.' }),
      422,
    );
  }
  return c.json(resultado.pdf);
});
