import { entrarCorpo } from '@pelada/contrato';
import { Hono } from 'hono';
import { entrar } from '../../aplicacao/acesso/entrar.js';
import { definirCookieSessao } from '../../infraestrutura/sessao/cookie.js';
import type { AppEnv } from '../app.js';
import { lerCorpo } from '../corpo.js';

/** `POST /api/sessao/entrar`: cria a sessão (204 com cookie), 401 genérico ou 429 se bloqueado. */
export const rotaSessaoEntrar = new Hono<AppEnv>().post('/api/sessao/entrar', async (c) => {
  const corpo = await lerCorpo(c, entrarCorpo);
  if (!corpo.ok) return corpo.resposta;

  const agora = new Date(c.var.relogio.agoraIso());
  const resultado = await entrar(c.var.db(), corpo.dado, agora);
  if (resultado.tipo === 'bloqueado') {
    return c.json(
      {
        erro: {
          codigo: 'bloqueado_temporariamente',
          mensagem: 'Muitas tentativas. Tente de novo em 15 minutos.',
          liberaEm: resultado.liberaEm.toISOString(),
        },
      },
      429,
    );
  }
  if (resultado.tipo === 'invalido') {
    return c.json({ erro: { codigo: 'credenciais_invalidas', mensagem: 'E-mail ou senha incorretos.' } }, 401);
  }
  definirCookieSessao(c, resultado.token);
  return c.body(null, 204);
});
