import { CODIGOS_ERRO } from '@pelada/contrato';
import type { Context } from 'hono';
import type { MarcacaoInvalida } from '../aplicacao/partidas/presencas.js';
import { corpoErro } from './erros.js';

/** 422 com um campo `marcacoes.<índice>.jogadorId` para cada marcação inválida. */
export function respostaMarcacaoInvalida(c: Context, erro: MarcacaoInvalida): Response {
  const campos: Record<string, string> = {};
  for (const p of erro.problemas) {
    campos[`marcacoes.${p.indice}.jogadorId`] =
      p.motivo === 'repetido' ? 'Jogador marcado mais de uma vez.' : 'Jogador não está ativo nesta data.';
  }
  return c.json(corpoErro(CODIGOS_ERRO.validacao, 'Corrija os campos indicados.', campos), 422);
}

/** 409 de partida repetida, na forma de `erro-partida-duplicada.json`. */
export function respostaPartidaDuplicada(c: Context, data: string): Response {
  return c.json(
    {
      erro: {
        codigo: CODIGOS_ERRO.partidaJaExiste,
        mensagem: `Já existe uma partida em ${data.split('-').reverse().join('/')}.`,
        dataExistente: data,
      },
    },
    409,
  );
}
