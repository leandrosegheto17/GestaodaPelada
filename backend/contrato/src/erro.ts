import { z } from 'zod';

export const CODIGOS_ERRO = {
  validacao: 'validacao',
  naoEncontrado: 'nao_encontrado',
  naoAutenticado: 'nao_autenticado',
  erroInterno: 'erro_interno',
  requisicaoRecusada: 'requisicao_recusada',
  trocaDeSenhaObrigatoria: 'troca_de_senha_obrigatoria',
  semPermissao: 'sem_permissao',
  corpoGrande: 'corpo_grande',
} as const;

const corpoBase = {
  codigo: z.string().regex(/^[a-z][a-z0-9_]*$/, 'Código em snake_case.'),
  mensagem: z.string().min(1),
  campos: z.record(z.string(), z.string()).optional(),
};

/** Erro padrão da API: `{ erro: { codigo, mensagem, campos? } }`. */
export const erroPadrao = z.object({ erro: z.object(corpoBase).passthrough() });
export type ErroPadrao = z.infer<typeof erroPadrao>;

/** Estende o erro padrão com campos próprios de um contexto (ex.: `dataExistente`). */
export const estenderErro = <E extends z.ZodRawShape>(extra: E) =>
  z.object({ erro: z.object({ ...corpoBase, ...extra }) });
