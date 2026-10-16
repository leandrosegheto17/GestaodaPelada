import { CODIGOS_ERRO, entradaSimulador } from '@pelada/contrato';
import { Hono } from 'hono';
import { AptoInvalido } from '../../../../aplicacao/simulador/entrada.js';
import { sugerirTimes } from '../../../../aplicacao/simulador/sugerir.js';
import type { AppEnv } from '../../../app.js';
import { lerCorpo } from '../../../corpo.js';
import { corpoErro, naoEncontrado, responderAptoInvalido } from '../../../erros.js';

/** `POST /api/grupos/:grupoId/simulador/sugerir`: a mesma entrada dá sempre a mesma sugestão. */
export const rotaSimuladorSugerir = new Hono<AppEnv>().post('/api/grupos/:grupoId/simulador/sugerir', async (c) => {
  const vinculo = c.var.vinculo;
  if (!vinculo) return naoEncontrado(c);
  const corpo = await lerCorpo(c, entradaSimulador);
  if (!corpo.ok) return corpo.resposta;
  try {
    const r = await sugerirTimes(c.var.db(), vinculo.grupoId, corpo.dado);
    if (!r.ok) {
      return c.json(corpoErro(CODIGOS_ERRO.validacao, 'Corrija os campos indicados.', { aptos: r.descricao }), 422);
    }
    // Uma linha por requisição para medir o custo (sem id, apelido nem grupo); o tempo de CPU vem da plataforma.
    console.log(
      JSON.stringify({
        evento: 'simulador_sugerir',
        formato: corpo.dado.formato,
        n: corpo.dado.n,
        k: corpo.dado.formato === 'dois_times' ? corpo.dado.k : null,
        aptos: corpo.dado.aptos.length,
      }),
    );
    return c.json(r.sugestao);
  } catch (erro) {
    if (erro instanceof AptoInvalido) return responderAptoInvalido(c);
    throw erro;
  }
});
