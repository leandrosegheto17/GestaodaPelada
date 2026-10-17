import { CODIGOS_ERRO } from '@pelada/contrato';
import { Hono } from 'hono';
import { DataFutura, DataInvalida, PartidaJaExiste, prepararPartidaNova } from '../../../../aplicacao/partidas/nova.js';
import type { AppEnv } from '../../../app.js';
import { corpoErro, naoEncontrado } from '../../../erros.js';
import { respostaPartidaDuplicada } from '../../../respostas-partida.js';

/** `GET /api/grupos/:grupoId/partidas/nova?data=`: dados para lançar a partida (rota estática, antes de `:data`). */
export const rotaPartidaNova = new Hono<AppEnv>().get('/api/grupos/:grupoId/partidas/nova', async (c) => {
  const vinculo = c.var.vinculo;
  if (!vinculo) return naoEncontrado(c);
  try {
    return c.json(
      await prepararPartidaNova(c.var.db(), vinculo.grupoId, { data: c.req.query('data'), hoje: c.var.relogio.hoje() }),
    );
  } catch (erro) {
    if (erro instanceof DataInvalida || erro instanceof DataFutura) {
      const mensagem = erro instanceof DataFutura ? 'A data não pode ser no futuro.' : 'Informe uma data válida.';
      return c.json(corpoErro(CODIGOS_ERRO.validacao, 'Corrija os campos indicados.', { data: mensagem }), 422);
    }
    if (erro instanceof PartidaJaExiste) {
      return respostaPartidaDuplicada(c, erro.data);
    }
    throw erro;
  }
});
