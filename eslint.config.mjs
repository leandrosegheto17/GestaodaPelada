import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import { importX } from 'eslint-plugin-import-x';
import {
  acumuladoSoNaPontuacao,
  donoSoEmScripts,
  semAsUnknownAs,
  semDocumentCookie,
  semRelogio,
} from './eslint/regras-sintaxe.mjs';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import peladaPlugin from './eslint/plugin-pelada.mjs';

const PROIBIDAS_BASE = [
  'prisma',
  '@prisma/*',
  'drizzle-orm',
  'drizzle-orm/*',
  'express',
  '@neondatabase/serverless',
  'bcrypt',
  'bcryptjs',
  'argon2',
  '@node-rs/*',
  'moment',
  'axios',
  'tailwindcss',
];
// Função destrutiva do seed: só backend/scripts pode importá-la (o bloco de scripts usa PROIBIDAS_BASE).
const SEED_LOCAL = ['**/repositorios/seed-local', '**/repositorios/seed-local.*'];
// Correção de período: só a aplicação (aplicacao/elenco/periodos-corrigir.ts), dentro da transação com o
// jogador travado e auditada, importa o repositório. O relativo `./` cobre os vizinhos da própria pasta.
const CORRIGIR_PERIODO = ['**/repositorios/periodos-corrigir', '**/repositorios/periodos-corrigir.*'];
const CORRIGIR_PERIODO_VIZINHO = ['./periodos-corrigir', './periodos-corrigir.*'];
const PROIBIDAS_GLOBAL = [...PROIBIDAS_BASE, ...SEED_LOCAL, ...CORRIGIR_PERIODO];
// Testes e o arquivo da aplicação que corrige período podem importar o repositório da correção.
const PROIBIDAS_COM_CORRECAO = [...PROIBIDAS_BASE, ...SEED_LOCAL];
const BANCO = ['pg', 'pg/*', 'kysely', 'kysely/*'];
const DOMINIO_PROIBIDAS = [
  'zod',
  'zod/*',
  'pg',
  'pg/*',
  'kysely',
  'kysely/*',
  'hono',
  'hono/*',
  '@pelada/contrato',
  '@pelada/contrato/*',
];
const WEB_PROIBIDAS = ['@pelada/dominio', '@pelada/dominio/*', '@pelada/api', '@pelada/api/*'];

const restritos = (nomes) => ({
  patterns: [{ group: nomes, message: 'Importação proibida nesta pasta (fronteira de pacotes).' }],
});

const escapar = (nome) => nome.replace(/[.+?^${}()|[\]\\/]/g, '\\$&').replace(/\*/g, '.*');
const casaLiteral = (nomes) => `^(${nomes.map(escapar).join('|')})$`;

const dinamicos = (nomes) => [
  {
    selector: "ImportExpression[source.type!='Literal']",
    message: 'import() com argumento não literal é proibido.',
  },
  {
    selector: "CallExpression[callee.name='require'][arguments.0.type!='Literal']",
    message: 'require() com argumento não literal é proibido.',
  },
  {
    selector: `ImportExpression[source.value=/${casaLiteral(nomes)}/]`,
    message: 'import() de pacote proibido nesta pasta.',
  },
  {
    selector: `CallExpression[callee.name='require'][arguments.0.value=/${casaLiteral(nomes)}/]`,
    message: 'require() de pacote proibido nesta pasta.',
  },
];

const SCRIPTS_PERMITIDOS = [
  'infraestrutura/db/repositorios',
  'infraestrutura/db/migracoes',
  'infraestrutura/seguranca',
  'aplicacao/acesso/senhas',
];
const MSG_ALIAS_API = 'Scripts só importam repositórios, migrações, seguranca e acesso/senhas de @pelada/api (G-01).';
const ALIAS_API_PROIBIDO = `^(?!@pelada\\/api\\/src\\/(${SCRIPTS_PERMITIDOS.map(escapar).join('|')})(\\/.*)?$)@pelada\\/api(\\/.*)?$`;

const sintaxe = (...grupos) => ['error', ...grupos.flat()];

const ZONAS = [
  {
    target: './frontend/web',
    from: ['./backend/dominio', './backend/api'],
    message: 'O web não importa domínio nem api (G-01).',
  },
  {
    target: './backend/dominio',
    from: ['./backend/contrato', './backend/api'],
    message: 'O domínio não importa contrato nem api (G-01).',
  },
  {
    target: './backend/api/src/entrada/rotas',
    from: './backend/api/src/entrada/rotas',
    message: 'Rota não importa rota; extraia para aplicacao/.',
  },
  {
    target: './backend/scripts',
    from: './backend/api/src',
    except: [
      './infraestrutura/db/repositorios',
      './infraestrutura/db/migracoes',
      './infraestrutura/db/index.ts',
      './infraestrutura/seguranca',
      './aplicacao/acesso/senhas.ts',
    ],
    message: 'Scripts só importam repositórios, migrações, seguranca e acesso/senhas (G-01).',
  },
];

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '.md/**',
      'evidencia/**',
      '.claude/**',
      '**/.wrangler/**',
      '**/node_modules/**',
      '**/coverage/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  { files: ['**/*.mjs'], languageOptions: { globals: globals.node } },
  {
    files: ['backend/**/*.{ts,tsx,mjs,js}', 'frontend/**/*.{ts,tsx,mjs,js}'],
    plugins: { 'import-x': importX },
    settings: {
      'import-x/resolver-next': [createTypeScriptImportResolver({ alwaysTryTypes: true })],
    },
    rules: {
      'no-restricted-imports': ['error', restritos([...PROIBIDAS_GLOBAL, ...BANCO])],
      'no-restricted-syntax': sintaxe(
        dinamicos([...PROIBIDAS_GLOBAL, ...BANCO]),
        semAsUnknownAs,
        acumuladoSoNaPontuacao,
      ),
      'import-x/no-restricted-paths': ['error', { basePath: import.meta.dirname, zones: ZONAS }],
    },
  },
  {
    files: ['backend/api/**'],
    rules: {
      'no-restricted-syntax': sintaxe(
        dinamicos([...PROIBIDAS_GLOBAL, ...BANCO]),
        semRelogio,
        semAsUnknownAs,
        donoSoEmScripts,
        acumuladoSoNaPontuacao,
      ),
    },
  },
  {
    // Apoio de teste da API conecta no Postgres de teste (nunca em produção).
    files: ['backend/api/test/**'],
    rules: {
      'no-restricted-imports': ['error', restritos(PROIBIDAS_COM_CORRECAO)],
      'no-restricted-syntax': sintaxe(
        dinamicos(PROIBIDAS_COM_CORRECAO),
        semRelogio,
        semAsUnknownAs,
        acumuladoSoNaPontuacao,
      ),
    },
  },
  {
    files: ['backend/api/src/infraestrutura/db/**'],
    rules: {
      'no-restricted-imports': ['error', restritos([...PROIBIDAS_GLOBAL, ...CORRIGIR_PERIODO_VIZINHO])],
      'no-restricted-syntax': sintaxe(
        dinamicos([...PROIBIDAS_GLOBAL, ...CORRIGIR_PERIODO_VIZINHO]),
        semRelogio,
        semAsUnknownAs,
        donoSoEmScripts,
        acumuladoSoNaPontuacao,
      ),
    },
  },
  {
    // O alias não passa pela zona de caminhos relativos; barra-se aqui, liberando os mesmos caminhos.
    files: ['backend/scripts/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            ...restritos([...PROIBIDAS_BASE, ...CORRIGIR_PERIODO, ...BANCO]).patterns,
            { regex: ALIAS_API_PROIBIDO, message: MSG_ALIAS_API },
          ],
        },
      ],
      'no-restricted-syntax': sintaxe(
        dinamicos([...PROIBIDAS_BASE, ...CORRIGIR_PERIODO, ...BANCO]),
        semAsUnknownAs,
        acumuladoSoNaPontuacao,
        [
          { selector: `ImportExpression[source.value=/${ALIAS_API_PROIBIDO}/]`, message: MSG_ALIAS_API },
          {
            selector: `CallExpression[callee.name='require'][arguments.0.value=/${ALIAS_API_PROIBIDO}/]`,
            message: MSG_ALIAS_API,
          },
        ],
      ),
    },
  },
  {
    // Único arquivo de produção que importa o repositório da correção de período.
    files: ['backend/api/src/aplicacao/elenco/periodos-corrigir.ts'],
    rules: {
      'no-restricted-imports': ['error', restritos([...PROIBIDAS_COM_CORRECAO, ...BANCO])],
      'no-restricted-syntax': sintaxe(
        dinamicos([...PROIBIDAS_COM_CORRECAO, ...BANCO]),
        semRelogio,
        semAsUnknownAs,
        donoSoEmScripts,
        acumuladoSoNaPontuacao,
      ),
    },
  },
  {
    files: ['backend/api/src/infraestrutura/relogio/**'],
    rules: {
      'no-restricted-syntax': sintaxe(
        dinamicos([...PROIBIDAS_GLOBAL, ...BANCO]),
        semAsUnknownAs,
        acumuladoSoNaPontuacao,
      ),
    },
  },
  {
    files: ['backend/dominio/**'],
    rules: {
      'no-restricted-imports': ['error', restritos([...PROIBIDAS_GLOBAL, ...DOMINIO_PROIBIDAS])],
      'no-restricted-syntax': sintaxe(
        dinamicos([...PROIBIDAS_GLOBAL, ...DOMINIO_PROIBIDAS]),
        semRelogio,
        semAsUnknownAs,
        acumuladoSoNaPontuacao,
      ),
    },
  },
  {
    // Único lugar que pode usar as funções internas de soma.
    files: ['backend/dominio/src/pontuacao/**', 'backend/dominio/test/pontuacao/**'],
    rules: {
      'no-restricted-syntax': sintaxe(
        dinamicos([...PROIBIDAS_GLOBAL, ...DOMINIO_PROIBIDAS]),
        semRelogio,
        semAsUnknownAs,
      ),
    },
  },
  {
    // G-11: o papel de dono só é escrito por backend/scripts, pelas migrações e por criarContaDono (regra por AST).
    files: ['**/*.{ts,tsx,js,mjs}'],
    // As ferramentas do contrato só leem `eDono` dos schemas para recusá-lo na entrada.
    ignores: ['backend/scripts/**', 'backend/contrato/ferramentas/**', '**/migracoes/**', '**/test/**', '**/*.test.*'],
    plugins: { pelada: peladaPlugin },
    rules: { 'pelada/sem-escrita-dono': 'error' },
  },
  {
    // G-26: periodos_ativos só é escrita pelos dois repositórios do período (regra por AST).
    files: ['backend/**/*.{ts,tsx,js,mjs}'],
    ignores: [
      'backend/api/src/infraestrutura/db/repositorios/jogadores.ts',
      'backend/api/src/infraestrutura/db/repositorios/periodos-corrigir.ts',
      '**/migracoes/**',
      '**/test/**',
      '**/*.test.*',
    ],
    plugins: { pelada: peladaPlugin },
    rules: { 'pelada/sem-escrita-periodo': 'error' },
  },
  {
    files: ['backend/api/src/infraestrutura/db/repositorios/contas.ts'],
    rules: { 'pelada/sem-escrita-dono': ['error', { funcoesPermitidas: ['criarContaDono'] }] },
  },
  {
    files: ['frontend/web/**'],
    rules: {
      'no-restricted-imports': ['error', restritos([...PROIBIDAS_GLOBAL, ...BANCO, ...WEB_PROIBIDAS])],
      'no-restricted-syntax': sintaxe(
        dinamicos([...PROIBIDAS_GLOBAL, ...BANCO, ...WEB_PROIBIDAS]),
        semDocumentCookie,
        semAsUnknownAs,
        donoSoEmScripts,
        acumuladoSoNaPontuacao,
      ),
    },
  },
);
