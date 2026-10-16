import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import { importX } from 'eslint-plugin-import-x';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';

const PROIBIDAS_GLOBAL = [
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

const MSG_RELOGIO = 'Use o relógio de infraestrutura/relogio (G-06).';
const semRelogio = [
  {
    selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
    message: MSG_RELOGIO,
  },
  {
    selector: "CallExpression[callee.object.name='Date'][callee.property.value='now']",
    message: MSG_RELOGIO,
  },
  {
    selector:
      "CallExpression[callee.object.object.name='globalThis'][callee.object.property.name='Date'][callee.property.name='now']",
    message: MSG_RELOGIO,
  },
  { selector: "NewExpression[callee.name='Date'][arguments.length=0]", message: MSG_RELOGIO },
  {
    selector: "NewExpression[callee.object.name='globalThis'][callee.property.name='Date'][arguments.length=0]",
    message: MSG_RELOGIO,
  },
];

const MSG_UNKNOWN = 'Proibido converter via unknown: escreva um adaptador tipado.';
const semAsUnknownAs = [
  {
    selector: "TSAsExpression > TSAsExpression[typeAnnotation.type='TSUnknownKeyword']",
    message: MSG_UNKNOWN,
  },
  {
    selector: "TSTypeAssertion > TSAsExpression[typeAnnotation.type='TSUnknownKeyword']",
    message: MSG_UNKNOWN,
  },
  { selector: "TSTypeAssertion[expression.type='TSAsExpression']", message: MSG_UNKNOWN },
  {
    selector: "TSAsExpression[expression.typeAnnotation.type='TSUnknownKeyword']",
    message: MSG_UNKNOWN,
  },
];

const MSG_COOKIE = 'document.cookie é proibido (G-09).';
const semDocumentCookie = [
  {
    selector: "MemberExpression[object.name='document'][property.name='cookie']",
    message: MSG_COOKIE,
  },
  {
    selector: "MemberExpression[object.name='document'][property.value='cookie']",
    message: MSG_COOKIE,
  },
  {
    selector: "MemberExpression[object.property.name='document'][property.name='cookie']",
    message: MSG_COOKIE,
  },
  {
    selector: "MemberExpression[object.property.name='document'][property.value='cookie']",
    message: MSG_COOKIE,
  },
  {
    selector: "VariableDeclarator[init.name='document'] > ObjectPattern > Property[key.name='cookie']",
    message: MSG_COOKIE,
  },
];

const MSG_DONO = 'criarContaDono e apagarDadosDoSeed só podem ser usadas por backend/scripts.';
const donoSoEmScripts = [
  { selector: "ImportSpecifier[imported.name='criarContaDono']", message: MSG_DONO },
  { selector: "MemberExpression[property.name='criarContaDono']", message: MSG_DONO },
  { selector: "ImportSpecifier[imported.name='apagarDadosDoSeed']", message: MSG_DONO },
  { selector: "MemberExpression[property.name='apagarDadosDoSeed']", message: MSG_DONO },
];

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
    ignores: ['**/dist/**', '.md/**', '.claude/**', '**/.wrangler/**', '**/node_modules/**', '**/coverage/**'],
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
      'no-restricted-syntax': sintaxe(dinamicos([...PROIBIDAS_GLOBAL, ...BANCO]), semAsUnknownAs),
      'import-x/no-restricted-paths': ['error', { basePath: import.meta.dirname, zones: ZONAS }],
    },
  },
  {
    files: ['backend/api/**'],
    rules: {
      'no-restricted-syntax': sintaxe(dinamicos([...PROIBIDAS_GLOBAL, ...BANCO]), semRelogio, semAsUnknownAs, donoSoEmScripts),
    },
  },
  {
    // Apoio de teste da API conecta no Postgres de teste (nunca em produção).
    files: ['backend/api/test/**'],
    rules: {
      'no-restricted-imports': ['error', restritos(PROIBIDAS_GLOBAL)],
      'no-restricted-syntax': sintaxe(dinamicos(PROIBIDAS_GLOBAL), semRelogio, semAsUnknownAs),
    },
  },
  {
    files: ['backend/api/src/infraestrutura/db/**'],
    rules: {
      'no-restricted-imports': ['error', restritos(PROIBIDAS_GLOBAL)],
      'no-restricted-syntax': sintaxe(dinamicos(PROIBIDAS_GLOBAL), semRelogio, semAsUnknownAs, donoSoEmScripts),
    },
  },
  {
    files: ['backend/api/src/infraestrutura/relogio/**'],
    rules: {
      'no-restricted-syntax': sintaxe(dinamicos([...PROIBIDAS_GLOBAL, ...BANCO]), semAsUnknownAs),
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
      ),
    },
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
      ),
    },
  },
);
