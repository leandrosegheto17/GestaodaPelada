import { CODIGOS_ERRO, inicioCorpo } from '@pelada/contrato';
import { Hono } from 'hono';
import { editarInicio } from '../../../../aplicacao/elenco/inicio-editar.js';
import { previaInicio } from '../../../../aplicacao/elenco/inicio-previa.js';
import type { AppEnv } from '../../../app.js';
import { lerCorpo } from '../../../corpo.js';
import { corpoErro, naoEncontrado } from '../../../erros.js';
import { uuidDaRota } from '../../../parametros.js';

const recusa = (mensagem: string) =>
  corpoErro(CODIGOS_ERRO.validacao, 'Corrija os campos indicados.', { data: mensagem });

/** `POST /api/grupos/:grupoId/jogadores/:id/inicio/previa`: efeito de trocar a data de início; não grava. */
export const rotaJogadorInicioPrevia = new Hono<AppEnv>().post(
  '/api/grupos/:grupoId/jogadores/:id/inicio/previa',
  async (c) => {
    const { vinculo } = c.var;
    const id = uuidDaRota(c, 'id');
    if (!vinculo || id === null) return naoEncontrado(c);
    const hoje = c.var.relogio.hoje();
    const corpo = await lerCorpo(c, inicioCorpo(hoje));
    if (!corpo.ok) return corpo.resposta;

    const r = await previaInicio(c.var.db(), vinculo.grupoId, id, corpo.dado.data, hoje);
    if (r.tipo === 'nao_encontrado') return naoEncontrado(c);
    if (r.tipo === 'invalida') return c.json(recusa(r.mensagem), 422);
    return c.json(r.previa);
  },
);

/** `PUT /api/grupos/:grupoId/jogadores/:id/inicio`: grava a data de início (igual à atual: nada é gravado). */
export const rotaJogadorInicioEditar = new Hono<AppEnv>().put(
  '/api/grupos/:grupoId/jogadores/:id/inicio',
  async (c) => {
    const { vinculo, sessao } = c.var;
    const id = uuidDaRota(c, 'id');
    if (!vinculo || !sessao || id === null) return naoEncontrado(c);
    const hoje = c.var.relogio.hoje();
    const corpo = await lerCorpo(c, inicioCorpo(hoje));
    if (!corpo.ok) return corpo.resposta;

    const r = await editarInicio(c.var.db(), vinculo.grupoId, id, corpo.dado.data, {
      hoje,
      autor: sessao.conta.id,
      agora: new Date(c.var.relogio.agoraIso()),
    });
    if (r.tipo === 'nao_encontrado') return naoEncontrado(c);
    if (r.tipo === 'invalida') return c.json(recusa(r.mensagem), 422);
    return c.json({ inicio: r.inicio, alterado: r.alterado });
  },
);
