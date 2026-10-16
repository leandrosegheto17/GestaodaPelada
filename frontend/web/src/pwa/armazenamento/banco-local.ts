const NOME_BANCO = 'pelada';
const VERSAO = 1;
const LOJA = 'kv';
const PREFIXO = 'pelada:';

let conexao: Promise<IDBDatabase | null> | null = null;

/** Descarta a conexão memorizada (troca de versão, fechamento forçado e testes). */
export function reiniciarBancoLocal(): void {
  conexao = null;
}

function abrir(): Promise<IDBDatabase | null> {
  if (conexao) return conexao;
  const nova = new Promise<IDBDatabase | null>((resolver) => {
    if (typeof indexedDB === 'undefined') return resolver(null);
    let pedido: IDBOpenDBRequest;
    try {
      pedido = indexedDB.open(NOME_BANCO, VERSAO);
    } catch {
      return resolver(null);
    }
    pedido.onupgradeneeded = () => {
      pedido.result.createObjectStore(LOJA);
    };
    pedido.onsuccess = () => {
      const banco = pedido.result;
      banco.onversionchange = () => {
        banco.close();
        conexao = null;
      };
      banco.onclose = () => {
        conexao = null;
      };
      resolver(banco);
    };
    pedido.onerror = () => resolver(null);
    pedido.onblocked = () => resolver(null);
  }).then((banco) => {
    if (!banco) conexao = null;
    return banco;
  });
  conexao = nova;
  return nova;
}

/** Executa uma operação numa transação; devolve `undefined` se qualquer coisa falhar. */
async function noBanco<T>(
  modo: IDBTransactionMode,
  operacao: (loja: IDBObjectStore) => IDBRequest<T>,
): Promise<T | undefined> {
  const banco = await abrir();
  if (!banco) return undefined;
  return new Promise<T | undefined>((resolver) => {
    try {
      const transacao = banco.transaction(LOJA, modo);
      const pedido = operacao(transacao.objectStore(LOJA));
      transacao.oncomplete = () => resolver(pedido.result);
      transacao.onabort = () => resolver(undefined);
      transacao.onerror = () => resolver(undefined);
    } catch {
      resolver(undefined);
    }
  });
}

function lerEspelho(chave: string): unknown {
  try {
    const texto = localStorage.getItem(PREFIXO + chave);
    return texto === null ? undefined : (JSON.parse(texto) as unknown);
  } catch {
    return undefined;
  }
}

/** Toda escrita vai ao IndexedDB e ao espelho; cada um pode falhar sem derrubar o outro. */
export async function gravar(chave: string, valor: unknown): Promise<void> {
  try {
    localStorage.setItem(PREFIXO + chave, JSON.stringify(valor));
  } catch {
    // Cota cheia ou acesso negado: o app segue sem essa cópia.
  }
  await noBanco('readwrite', (loja) => loja.put(valor, chave));
}

/** Lê do IndexedDB; se ele falhar ou não tiver o valor, lê o espelho. `undefined` = ausente. */
export async function ler(chave: string): Promise<unknown> {
  const doBanco = await noBanco('readonly', (loja) => loja.get(chave) as IDBRequest<unknown>);
  return doBanco !== undefined ? doBanco : lerEspelho(chave);
}

export async function apagar(chave: string): Promise<void> {
  try {
    localStorage.removeItem(PREFIXO + chave);
  } catch {
    // Sem acesso ao espelho: nada a apagar nele.
  }
  await noBanco('readwrite', (loja) => loja.delete(chave));
}
