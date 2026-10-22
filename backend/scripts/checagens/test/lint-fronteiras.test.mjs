import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';

const RAIZ = resolve(import.meta.dirname, '../../../..');
const eslint = new ESLint({ cwd: RAIZ });

async function regras(codigo, arquivo) {
  const [resultado] = await eslint.lintText(codigo, { filePath: resolve(RAIZ, arquivo) });
  return resultado.messages
    .filter((m) => m.ruleId?.startsWith('no-restricted') || m.ruleId?.startsWith('import-x'))
    .map((m) => m.ruleId);
}

const WEB = 'frontend/web/src/x.ts';
const DOMINIO = 'backend/dominio/src/x.ts';
const API = 'backend/api/src/aplicacao/x.ts';
const DB = 'backend/api/src/infraestrutura/db/x.ts';

describe('fronteiras de pacote', () => {
  it.each([
    ["import { a } from '@pelada/dominio';", WEB],
    ["import { a } from '@pelada/api/src/x';", WEB],
    ["import { z } from 'zod';", DOMINIO],
    ["import pg from 'pg';", DOMINIO],
    ["import { Kysely } from 'kysely';", DOMINIO],
    ["import { Hono } from 'hono';", DOMINIO],
    ["import { a } from '@pelada/contrato';", DOMINIO],
    ["import pg from 'pg';", API],
    ["import { Kysely } from 'kysely';", API],
    ["export * from 'kysely';", API],
    ["const m = await import('pg');", API],
    ['const m = await import(nome);', API],
    ["import bcrypt from 'bcryptjs';", API],
    ["import axios from 'axios';", WEB],
    ["import { a } from '../../../backend/dominio/src/index';", WEB],
  ])('barra %s em %s', async (codigo, arquivo) => {
    expect((await regras(codigo, arquivo)).length).toBeGreaterThan(0);
  });

  it.each([
    ["import pg from 'pg';", DB],
    ["// import pg from 'pg';", API],
    ["const nome = 'pg';", API],
    ["import { z } from 'zod';", API],
    ["import('jspdf');", WEB],
    ['', API],
    ['', DOMINIO],
  ])('aceita %s em %s', async (codigo, arquivo) => {
    expect(await regras(codigo, arquivo)).toEqual([]);
  });
});

describe('relógio (G-06)', () => {
  it.each(['Date.now();', "Date['now']();", 'globalThis.Date.now();', 'new Date();', 'new globalThis.Date();'])(
    'barra %s no domínio e na API',
    async (codigo) => {
      expect((await regras(codigo, DOMINIO)).length).toBeGreaterThan(0);
      expect((await regras(codigo, API)).length).toBeGreaterThan(0);
    },
  );

  it.each([
    'const { now } = Date; now();',
    'const { now } = globalThis.Date; now();',
    'const D = Date; D.now();',
    'const D = globalThis.Date; D.now();',
  ])('barra o alias %s no domínio e na API', async (codigo) => {
    expect((await regras(codigo, DOMINIO)).length).toBeGreaterThan(0);
    expect((await regras(codigo, API)).length).toBeGreaterThan(0);
  });

  it('aceita alias de Date no relógio de infraestrutura', async () => {
    expect(await regras('const D = Date; D.now();', 'backend/api/src/infraestrutura/relogio/relogio.ts')).toEqual([]);
  });

  it('aceita new Date(0) e o relógio de infraestrutura', async () => {
    expect(await regras('new Date(0);', DOMINIO)).toEqual([]);
    expect(await regras('Date.now();', 'backend/api/src/infraestrutura/relogio/relogio.ts')).toEqual([]);
  });
});

describe('conversões e cookie', () => {
  it('barra "as unknown as" e as duas formas de document.cookie', async () => {
    expect((await regras('const a = b as unknown as C;', API)).length).toBeGreaterThan(0);
    expect((await regras('const a = <C><unknown>b;', API)).length).toBeGreaterThan(0);
    for (const codigo of [
      'document.cookie;',
      "document['cookie'];",
      'window.document.cookie;',
      'globalThis.document.cookie;',
      'const { cookie } = document;',
    ]) {
      expect((await regras(codigo, WEB)).length, codigo).toBeGreaterThan(0);
    }
  });

  it.each(['const d = document; d.cookie;', 'const d = globalThis.document; d.cookie;'])(
    'barra o alias %s no web',
    async (codigo) => {
      expect((await regras(codigo, WEB)).length).toBeGreaterThan(0);
    },
  );

  it('aceita document.cookie fora do web? não: só o web é restrito', async () => {
    expect(await regras('document.cookie;', 'backend/api/src/x.ts')).toEqual([]);
  });
});

describe('fronteiras por caminho real', () => {
  it('rota não importa rota', async () => {
    const ids = await regras("import { a } from './sessao-eu';", 'backend/api/src/entrada/rotas/uma.ts');
    expect(ids).toContain('import-x/no-restricted-paths');
  });

  it('scripts só importam os quatro caminhos permitidos', async () => {
    const fora = await regras("import { a } from '../api/src/aplicacao/acesso/entrar';", 'backend/scripts/x.ts');
    expect(fora).toContain('import-x/no-restricted-paths');
    const dentro = await regras("import { a } from '../api/src/aplicacao/acesso/senhas';", 'backend/scripts/x.ts');
    expect(dentro).not.toContain('import-x/no-restricted-paths');
  });

  const SCRIPT = 'backend/scripts/x.ts';
  const FORA_ALIAS = [
    "import { a } from '@pelada/api/src/aplicacao/acesso/entrar';",
    "import { a } from '@pelada/api';",
    "import { a } from '@pelada/api/src/infraestrutura/db';",
    "import { a } from '@pelada/api/src/aplicacao/acesso/senhas-outra';",
    "export * from '@pelada/api/src/aplicacao/acesso/entrar';",
    "export { a } from '@pelada/api/src/entrada/app';",
    "const m = await import('@pelada/api/src/aplicacao/acesso/entrar');",
    "const m = require('@pelada/api/src/aplicacao/acesso/entrar');",
    "import { a } from '@pelada/api/src/infraestrutura/seguranca-x';",
  ];
  const DENTRO_ALIAS = [
    "import { a } from '@pelada/api/src/infraestrutura/db/repositorios';",
    "import { a } from '@pelada/api/src/infraestrutura/db/repositorios/contas';",
    "import { a } from '@pelada/api/src/infraestrutura/db/migracoes';",
    "import { a } from '@pelada/api/src/infraestrutura/seguranca/hash';",
    "import { a } from '@pelada/api/src/aplicacao/acesso/senhas';",
    "export { a } from '@pelada/api/src/aplicacao/acesso/senhas';",
    "const m = await import('@pelada/api/src/aplicacao/acesso/senhas');",
    "// import { a } from '@pelada/api/src/aplicacao/acesso/entrar';",
    "const n = '@pelada/api';",
  ];

  it.each(FORA_ALIAS)('scripts: barra por alias %s', async (codigo) => {
    expect((await regras(codigo, SCRIPT)).length).toBeGreaterThan(0);
  });

  it.each(DENTRO_ALIAS)('scripts: aceita por alias %s', async (codigo) => {
    const ids = await regras(codigo, SCRIPT);
    expect(ids.filter((id) => id !== 'import-x/no-unresolved')).toEqual([]);
  });
});

describe('acumulado pela função única (G-25)', () => {
  const PONTUACAO = 'backend/dominio/src/pontuacao/x.ts';
  const consumidores = [
    'backend/dominio/src/ranking/x.ts',
    'backend/dominio/src/pdf/x.ts',
    'backend/dominio/src/simulador/x.ts',
    'backend/scripts/importar-legado/x.ts',
    API,
    WEB,
  ];
  const usos = [
    "import { acumuladoComInicial } from '@pelada/dominio'; acumuladoComInicial(0, [], [], 'x');",
    "import { acumuladoAte } from '@pelada/dominio'; acumuladoAte([], [], 'x');",
    "import * as d from '@pelada/dominio'; d.acumuladoAte([], [], 'x');",
  ];

  it.each(consumidores.flatMap((arquivo) => usos.map((codigo) => [codigo, arquivo])))(
    'barra %s em %s',
    async (codigo, arquivo) => {
      expect((await regras(codigo, arquivo)).length).toBeGreaterThan(0);
    },
  );

  it('aceita o uso dentro de dominio/src/pontuacao e a função única fora dela', async () => {
    expect(await regras(usos[0], PONTUACAO)).toEqual([]);
    expect(await regras('acumuladoPorInicio({});', 'backend/dominio/src/ranking/x.ts')).toEqual([]);
  });
});

describe('correção de período só na aplicação (G-26)', () => {
  const PERMITIDO = 'backend/api/src/aplicacao/elenco/periodos-corrigir.ts';
  const REPO = '../../infraestrutura/db/repositorios/periodos-corrigir.js';
  const importacoes = [
    `import { corrigirPeriodo } from '${REPO}';`,
    `import { corrigirPeriodo as c } from '${REPO}';`,
    `import * as j from '${REPO}';`,
    `import j from '${REPO}';`,
    `export { corrigirPeriodo } from '${REPO}';`,
    `export * from '${REPO}';`,
    `export { corrigirPeriodo as outra } from '${REPO}';`,
    "import { corrigirPeriodo } from '../../../infraestrutura/db/repositorios/periodos-corrigir';",
    "import { corrigirPeriodo } from '@pelada/api/src/infraestrutura/db/repositorios/periodos-corrigir.js';",
    `const m = await import('${REPO}');`,
    `const m = require('${REPO}');`,
    'const m = await import(caminho);',
  ];
  const lugares = [
    'backend/api/src/aplicacao/elenco/reativar.ts',
    'backend/api/src/entrada/rotas/grupos/jogadores/situacao.ts',
    'backend/api/src/infraestrutura/db/repositorios/jogadores.ts',
    'backend/api/src/aplicacao/elenco/periodos-corrigir-outro.ts',
    'backend/api/src/aplicacao/periodos-corrigir.ts',
    'backend/scripts/x.ts',
    'backend/dominio/src/x.ts',
    'frontend/web/src/x.ts',
  ];

  it.each(lugares.flatMap((arquivo) => importacoes.map((codigo) => [codigo, arquivo])))(
    'barra %s em %s',
    async (codigo, arquivo) => {
      expect((await regras(codigo, arquivo)).length).toBeGreaterThan(0);
    },
  );

  it.each(['./periodos-corrigir', './periodos-corrigir.js'])(
    'barra o vizinho relativo %s na pasta dos repositórios',
    async (alvo) => {
      const ids = await regras(
        `import { corrigirPeriodo } from '${alvo}';`,
        'backend/api/src/infraestrutura/db/repositorios/jogadores.ts',
      );
      expect(ids.length).toBeGreaterThan(0);
    },
  );

  it('aceita o import no único arquivo permitido e nos testes', async () => {
    expect(await regras(`import { corrigirPeriodo } from '${REPO}';`, PERMITIDO)).toEqual([]);
    expect(
      await regras(
        "import { corrigirPeriodo } from '../../src/infraestrutura/db/repositorios/periodos-corrigir.js';",
        'backend/api/test/repositorios/periodos-corrigir.test.ts',
      ),
    ).toEqual([]);
  });

  it('o arquivo permitido continua barrando os outros pacotes proibidos', async () => {
    expect((await regras("import pg from 'pg';", PERMITIDO)).length).toBeGreaterThan(0);
  });

  it.each([
    `// import { corrigirPeriodo } from '${REPO}';`,
    `const nome = '${REPO}';`,
    "import { corrigirPeriodoDoJogador } from '../../aplicacao/elenco/periodos-corrigir.js';",
    "import * as jogadores from '../../infraestrutura/db/repositorios/jogadores.js';",
  ])('ignora comentário, string e outros módulos: %s', async (codigo) => {
    const ids = await regras(codigo, 'backend/api/src/entrada/rotas/grupos/jogadores/situacao.ts');
    expect(ids.filter((id) => id !== 'import-x/no-restricted-paths')).toEqual([]);
  });
});
