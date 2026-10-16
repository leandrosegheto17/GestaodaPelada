// Ponto de entrada público do módulo de dados: não exporta a conexão nem o Kysely.
export { criarDb, fecharDb } from './cliente.js';
export type { Db, Tx, ExecutorDb, FonteDeConexao, ContextoDeExecucao } from './cliente.js';
export { emTransacao } from './transacao.js';
