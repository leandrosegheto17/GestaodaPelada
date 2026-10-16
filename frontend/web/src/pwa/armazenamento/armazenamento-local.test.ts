import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  avisoInstalacaoFechado,
  esquecerGrupo,
  fecharAvisoInstalacao,
  grupoLembrado,
  guardarUltimoRanking,
  idAnonimo,
  lembrarGrupo,
  ultimoRanking,
} from './armazenamento-local';
import { gravar, ler, reiniciarBancoLocal } from './banco-local';

const RANKING = JSON.parse(
  readFileSync(join(import.meta.dirname, '../../../../../.md/mockup/respostas/publico-ranking-2026-10.json'), 'utf8'),
) as unknown;

beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  localStorage.clear();
  reiniciarBancoLocal();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  reiniciarBancoLocal();
});

describe('grupo lembrado', () => {
  it('lembrar, ler e esquecer, nos dois meios', async () => {
    await lembrarGrupo('pelada-de-quinta');
    expect(await grupoLembrado()).toBe('pelada-de-quinta');
    expect(localStorage.getItem('pelada:grupo-lembrado')).toBe('"pelada-de-quinta"');
    await esquecerGrupo();
    expect(await grupoLembrado()).toBeNull();
    expect(localStorage.getItem('pelada:grupo-lembrado')).toBeNull();
  });

  it.each(['Pelada', '../x', 'a'.repeat(65), ''])('slug %j é recusado na escrita', async (slug) => {
    await lembrarGrupo(slug);
    expect(await grupoLembrado()).toBeNull();
  });

  it('valor corrompido vira null', async () => {
    await gravar('grupo-lembrado', '../etc/passwd');
    expect(await grupoLembrado()).toBeNull();
  });
});

describe('id anônimo', () => {
  it('gera um uuid v4 uma vez e devolve o mesmo depois', async () => {
    const primeiro = await idAnonimo();
    expect(primeiro).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(await idAnonimo()).toBe(primeiro);
  });

  it('chamadas em paralelo devolvem o mesmo id', async () => {
    const ids = await Promise.all([idAnonimo(), idAnonimo(), idAnonimo()]);
    expect(new Set(ids).size).toBe(1);
  });

  it('valor que não é uuid é regenerado', async () => {
    await gravar('id-anonimo', 'qualquer-coisa');
    const id = await idAnonimo();
    expect(id).not.toBe('qualquer-coisa');
    expect(await idAnonimo()).toBe(id);
  });
});

describe('último ranking', () => {
  it('guarda e lê por slug e mês', async () => {
    await guardarUltimoRanking('pelada-de-quinta', '2026-10', { geradoEm: '2026-10-22T21:40:00Z', dados: RANKING });
    expect(await ultimoRanking('pelada-de-quinta', '2026-10')).toEqual({
      geradoEm: '2026-10-22T21:40:00Z',
      dados: RANKING,
    });
    expect(await ultimoRanking('pelada-de-quinta', '2026-09')).toBeNull();
    expect(await ultimoRanking('racha-de-domingo', '2026-10')).toBeNull();
  });

  it.each(['2026-13', '2026-1', 'outubro'])('mês %j é recusado', async (mes) => {
    await guardarUltimoRanking('pelada-de-quinta', mes, { geradoEm: '2026-10-22T21:40:00Z', dados: RANKING });
    expect(await ultimoRanking('pelada-de-quinta', mes)).toBeNull();
  });

  it('forma inesperada guardada vira null', async () => {
    await gravar('ranking:pelada-de-quinta:2026-10', { geradoEm: 5 });
    expect(await ultimoRanking('pelada-de-quinta', '2026-10')).toBeNull();
  });
});

describe('aviso de instalação', () => {
  it('falso por padrão; fechar persiste', async () => {
    expect(await avisoInstalacaoFechado()).toBe(false);
    await fecharAvisoInstalacao();
    expect(await avisoInstalacaoFechado()).toBe(true);
  });
});

describe('falhas do IndexedDB caem no espelho', () => {
  it('indexedDB indefinido', async () => {
    vi.stubGlobal('indexedDB', undefined);
    await lembrarGrupo('pelada-de-quinta');
    expect(await grupoLembrado()).toBe('pelada-de-quinta');
  });

  it('open que lança', async () => {
    vi.spyOn(indexedDB, 'open').mockImplementation(() => {
      throw new Error('indisponível');
    });
    await lembrarGrupo('pelada-de-quinta');
    expect(await grupoLembrado()).toBe('pelada-de-quinta');
  });

  it('open que dispara onerror (versão mais nova já existe)', async () => {
    const fabrica = new IDBFactory();
    await new Promise<void>((resolver) => {
      const pedido = fabrica.open('pelada', 2);
      pedido.onsuccess = () => {
        pedido.result.close();
        resolver();
      };
    });
    vi.stubGlobal('indexedDB', fabrica);
    reiniciarBancoLocal();
    await lembrarGrupo('pelada-de-quinta');
    expect(await grupoLembrado()).toBe('pelada-de-quinta');
  });

  it('transação que aborta na escrita', async () => {
    const original = IDBDatabase.prototype.transaction;
    vi.spyOn(IDBDatabase.prototype, 'transaction').mockImplementation(function (this: IDBDatabase, ...args) {
      const transacao = original.apply(this, args);
      queueMicrotask(() => transacao.abort());
      return transacao;
    });
    await lembrarGrupo('pelada-de-quinta');
    expect(await grupoLembrado()).toBe('pelada-de-quinta');
  });

  it('localStorage lança QuotaExceededError: a escrita no IndexedDB segue e nada lança', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('cheio', 'QuotaExceededError');
    });
    await expect(lembrarGrupo('pelada-de-quinta')).resolves.toBeUndefined();
    expect(await ler('grupo-lembrado')).toBe('pelada-de-quinta');
    expect(localStorage.getItem('pelada:grupo-lembrado')).toBeNull();
  });
});
