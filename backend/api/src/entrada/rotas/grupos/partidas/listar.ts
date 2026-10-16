import { CODIGOS_ERRO, mes as esquemaMes } from '@pelada/contrato';
import { Hono } from 'hono';
import { listarPartidasDoMes, MesFuturo } from '../../../../aplicacao/partidas/listar-mes.js';
import type { AppEnv } from '../../../app.js';
import { corpoErro, naoEncontrado } from '../../../erros.js';

/** `GET /api/grupos/:grupoId/partidas?mes=AAAA-MM`: partidas do mês (padrão: o mês atual). */
export const rotaPartidasListar = new Hono<AppEnv>().get('/api/grupos/:grupoId/partidas', async (c) => {
  const vinculo = c.var.vinculo;
  if (!vinculo) return naoEncontrado(c);
  const pedido = c.req.query('mes') ?? c.var.relogio.mes();
  const mes = esquemaMes.safeParse(pedido);
  if (!mes.success) {
    return c.json(
      corpoErro(CODIGOS_ERRO.validacao, 'Corrija os campos indicados.', { mes: 'Informe o mês como AAAA-MM.' }),
      422,
    );
  }
  try {
    return c.json(
      await listarPartidasDoMes(c.var.db(), vinculo.grupoId, { mes: mes.data, hoje: c.var.relogio.hoje() }),
    );
  } catch (erro) {
    if (erro instanceof MesFuturo) {
      return c.json(
        corpoErro(CODIGOS_ERRO.validacao, 'Corrija os campos indicados.', { mes: 'O mês não pode ser futuro.' }),
        422,
      );
    }
    throw erro;
  }
});
