import { z } from 'zod';
import { LIMITES } from './limites.js';
import { email, idResposta } from './primitivos.js';
import type { Esquemas } from './registro-tipos.js';

const MENSAGEM_NOME = `O nome precisa ter de ${LIMITES.nomeAdmin.min} a ${LIMITES.nomeAdmin.max} caracteres.`;

export const nomeAdmin = z
  .string()
  .trim()
  .min(LIMITES.nomeAdmin.min, MENSAGEM_NOME)
  .max(LIMITES.nomeAdmin.max, MENSAGEM_NOME);

export const contaResumo = z.strictObject({ contaId: idResposta, nome: z.string() });

export const adminDoGrupo = z.strictObject({
  contaId: idResposta,
  nome: z.string(),
  email: z.string(),
  acessaFinanceiro: z.boolean(),
  voce: z.boolean(),
});

export const listaAdmins = z.strictObject({
  admins: z.array(adminDoGrupo),
  podeGerirFinanceiro: z.boolean(),
});
export type ListaAdmins = z.infer<typeof listaAdmins>;

export const adicionarAdminCorpo = z.strictObject({ nome: nomeAdmin, email });

/** Senha temporária: aparece uma única vez, na resposta que a cria. */
export const senhaExibida = contaResumo.extend({ senhaTemporaria: z.string().min(1) });

/** Conta nova traz a senha temporária; vínculo de conta existente traz `null`. */
export const adminAdicionado = z.discriminatedUnion('contaNova', [
  contaResumo.extend({ contaNova: z.literal(true), senhaTemporaria: z.string().min(1) }),
  contaResumo.extend({ contaNova: z.literal(false), senhaTemporaria: z.null() }),
]);
export type AdminAdicionado = z.infer<typeof adminAdicionado>;

export const financeiroAdminCorpo = z.strictObject({ acessaFinanceiro: z.boolean() });

export const esquemasAdmins: Esquemas = {
  'admins.lista': { direcao: 'resposta', schema: listaAdmins },
  'admins.adicionar.corpo': { direcao: 'entrada', schema: adicionarAdminCorpo },
  'admins.adicionado': { direcao: 'resposta', schema: adminAdicionado },
  'admins.senha-exibida': { direcao: 'resposta', schema: senhaExibida },
  'admins.financeiro.corpo': { direcao: 'entrada', schema: financeiroAdminCorpo },
};
