import { criarDb, fecharDb, type Db } from '../../src/infraestrutura/db/index.js';
import { exigirHostPermitido } from '../../src/infraestrutura/seguranca/trava-host.js';
import type { Fabrica } from './fabrica.js';
import { URL_BANCO_TESTE } from './url-teste.js';

export interface DbDeTeste {
  db: Db;
  /** Promessas entregues ao `waitUntil` do contexto falso. */
  promessas: Promise<unknown>[];
  fechar(): Promise<void>;
}

/** Abre uma conexão (uma "requisição") contra o banco de teste, passando pela trava de host. */
export async function abrirDbDeTeste(): Promise<DbDeTeste> {
  await exigirHostPermitido({ url: URL_BANCO_TESTE });
  const promessas: Promise<unknown>[] = [];
  const db = criarDb({ connectionString: URL_BANCO_TESTE }, { waitUntil: (p) => void promessas.push(p) });
  return {
    db,
    promessas,
    async fechar() {
      await fecharDb(db);
      await Promise.all(promessas);
    },
  };
}

/**
 * Conexão do teste. O fechamento é a primeira coisa registrada na fábrica, então roda por último
 * (a fábrica desfaz na ordem inversa) e as limpezas ainda encontram a conexão aberta.
 */
export function usarDb(fabrica: Fabrica) {
  return async (): Promise<Db> => {
    const aberta = await abrirDbDeTeste();
    fabrica.registrar(() => aberta.fechar());
    return aberta.db;
  };
}
