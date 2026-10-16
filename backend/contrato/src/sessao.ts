import { z } from 'zod';
import { diaSemana, escopoSessao, frequencia } from './enums.js';
import { estenderErro } from './erro.js';
import { LIMITES, bytesUtf8 } from './limites.js';
import { email, horario, idResposta, slug } from './primitivos.js';
import type { Esquemas } from './registro-tipos.js';

const MENSAGEM_SENHA = `A senha precisa ter de ${LIMITES.senha.min} a ${LIMITES.senha.max} caracteres.`;

/** Senha nova: de 8 a 72 caracteres (por ponto de código) e no máximo 72 bytes em UTF-8. */
export const senhaNova = z.string().refine((valor) => {
  const caracteres = [...valor].length;
  return (
    caracteres >= LIMITES.senha.min &&
    caracteres <= LIMITES.senha.max &&
    bytesUtf8(valor) <= LIMITES.senha.bytesMax
  );
}, MENSAGEM_SENHA);

/** Senha digitada no login: sem regra de mínimo, para não distinguir a mensagem. */
const senhaDeEntrada = z
  .string()
  .min(1, 'Informe a senha.')
  .refine((valor) => bytesUtf8(valor) <= LIMITES.senha.bytesMax, MENSAGEM_SENHA);

export const entrarCorpo = z.strictObject({ email, senha: senhaDeEntrada });
export const esqueciSenhaCorpo = z.strictObject({ email });

/**
 * `senhaAtual` é opcional aqui: no escopo `troca_de_senha` ela não existe. A exigência no escopo
 * completo e "diferente da temporária" são checadas na rota.
 */
export const trocarSenhaCorpo = z
  .strictObject({
    senhaAtual: z
      .string()
      .min(1)
      .max(LIMITES.senha.max * 4)
      .optional(),
    novaSenha: senhaNova,
    confirmacao: z.string(),
  })
  .refine((corpo) => corpo.confirmacao === corpo.novaSenha, {
    path: ['confirmacao'],
    message: 'As senhas não conferem.',
  });

export const grupoDaSessao = z.strictObject({
  id: idResposta,
  nome: z.string(),
  slug,
  diaSemana,
  frequencia,
  horario,
  acessaFinanceiro: z.boolean(),
});

export const sessaoEu = z.strictObject({
  conta: z.strictObject({
    id: idResposta,
    nome: z.string(),
    email: z.string(),
    eDono: z.boolean(),
  }),
  escopo: escopoSessao,
  avisoPrivacidadeVisto: z.boolean(),
  enderecoNovo: z.url().nullable().optional(),
  grupos: z.array(grupoDaSessao),
});
export type SessaoEu = z.infer<typeof sessaoEu>;

export const esqueciSenhaResposta = z.strictObject({ mensagem: z.string() });

export const erroNaoAutenticado = estenderErro({
  codigo: z.enum(['nao_autenticado', 'credenciais_invalidas']),
});

export const erroBloqueado = estenderErro({
  codigo: z.literal('bloqueado_temporariamente'),
  liberaEm: z.iso.datetime(),
});

export const esquemasSessao: Esquemas = {
  'sessao.entrar.corpo': { direcao: 'entrada', schema: entrarCorpo },
  'sessao.esqueci-senha.corpo': { direcao: 'entrada', schema: esqueciSenhaCorpo },
  'sessao.trocar-senha.corpo': { direcao: 'entrada', schema: trocarSenhaCorpo },
  'sessao.eu': { direcao: 'resposta', schema: sessaoEu },
  'sessao.esqueci-senha.resposta': { direcao: 'resposta', schema: esqueciSenhaResposta },
  'sessao.erro.nao-autenticado': { direcao: 'resposta', schema: erroNaoAutenticado },
  'sessao.erro.bloqueado': { direcao: 'resposta', schema: erroBloqueado },
};
