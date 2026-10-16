import { ehTransacao, embrulhar, kyselyDe, type Db, type Tx } from './cliente.js';

/**
 * Executa `fn` numa transação: BEGIN, COMMIT no sucesso, ROLLBACK e relança no erro,
 * sempre na mesma conexão. Não aceita transação aninhada.
 */
export async function emTransacao<T>(db: Db, fn: (tx: Tx) => Promise<T>): Promise<T> {
  if (ehTransacao(db)) {
    throw new Error('emTransacao não pode ser chamado dentro de uma transação.');
  }
  return kyselyDe(db)
    .transaction()
    .execute((kyselyTx) => fn(embrulhar(kyselyTx, true) as Tx));
}
