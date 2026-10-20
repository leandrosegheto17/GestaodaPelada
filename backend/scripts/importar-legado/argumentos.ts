import { ErroLegado } from './tipos.ts';

export interface ArgumentosLegado {
  grupo: string;
  cadastro: string;
  rodadas: string;
  correcoes: string | undefined;
  alvo: string | undefined;
  dryRun: boolean;
  confirmoBackup: boolean;
}

const COM_VALOR = new Set(['grupo', 'cadastro', 'rodadas', 'correcoes', 'alvo']);
const SEM_VALOR = new Set(['dry-run', 'confirmo-backup']);

/**
 * Argumentos estritos: qualquer flag desconhecida (como uma URL de banco) é recusada. A conexão vem só de
 * `DATABASE_URL`, no ambiente de quem opera.
 */
export function lerArgumentosLegado(argv: readonly string[]): ArgumentosLegado {
  const valores = new Map<string, string>();
  const marcas = new Set<string>();
  for (let i = 0; i < argv.length; i++) {
    const argumento = argv[i] as string;
    const nome = argumento.startsWith('--') ? argumento.slice(2) : null;
    if (nome !== null && SEM_VALOR.has(nome)) {
      marcas.add(nome);
    } else if (nome !== null && COM_VALOR.has(nome)) {
      const valor = argv[++i];
      if (valor === undefined || valor.startsWith('--')) throw new ErroLegado(`A flag --${nome} precisa de um valor.`);
      valores.set(nome, valor);
    } else {
      throw new ErroLegado('Argumento não reconhecido. A conexão vem só de DATABASE_URL.');
    }
  }
  const exigir = (nome: string): string => {
    const valor = valores.get(nome);
    if (!valor) throw new ErroLegado(`Informe --${nome}.`);
    return valor;
  };
  return {
    grupo: exigir('grupo'),
    cadastro: exigir('cadastro'),
    rodadas: exigir('rodadas'),
    correcoes: valores.get('correcoes'),
    alvo: valores.get('alvo'),
    dryRun: marcas.has('dry-run'),
    confirmoBackup: marcas.has('confirmo-backup'),
  };
}
