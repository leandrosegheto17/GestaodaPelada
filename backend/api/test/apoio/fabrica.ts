import { afterEach } from 'vitest';

type Limpeza = () => Promise<void> | void;

export interface Fabrica {
  /** Registra o que desfaz um dado criado pelo teste. */
  registrar(limpeza: Limpeza): void;
  /** Desfaz tudo na ordem inversa; continua mesmo se uma limpeza falhar e relança o 1º erro no fim. */
  limpar(): Promise<void>;
}

export function criarFabrica(): Fabrica {
  const limpezas: Limpeza[] = [];
  return {
    registrar: (limpeza) => void limpezas.push(limpeza),
    async limpar() {
      let primeiroErro: unknown;
      let falhou = false;
      while (limpezas.length > 0) {
        const limpeza = limpezas.pop() as Limpeza;
        try {
          await limpeza();
        } catch (erro) {
          if (!falhou) {
            falhou = true;
            primeiroErro = erro;
          }
        }
      }
      if (falhou) throw primeiroErro;
    },
  };
}

/** Fábrica ligada ao `afterEach`: a limpeza roda também quando o teste falha. */
export function usarFabrica(): Fabrica {
  const fabrica = criarFabrica();
  afterEach(() => fabrica.limpar());
  return fabrica;
}
