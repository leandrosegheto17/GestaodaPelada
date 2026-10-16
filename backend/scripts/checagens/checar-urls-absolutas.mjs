import { arquivosVersionados, encerrar, procurar } from './arquivos.mjs';

const RAIZ = process.argv[2] ?? process.cwd();
const ESCOPO = /^(backend|frontend|\.github)\/|^[^/]+$/;
const FORA =
  /^(\.md|\.claude)\/|^pnpm-lock\.yaml$|\/node_modules\/|(^|\/)(test|e2e|config)\/|\.test\.[a-z]+$|\.md$/;
const URL_ABSOLUTA = /[a-z][a-z0-9+.-]*:\/\/|(["'`])\/\/[a-z0-9-]+\.[a-z]{2,}|workers\.dev/i;

// Exceções explícitas: espaços de nomes e esquemas que não são endereço de serviço.
const EXCECOES = [
  'http://localhost',
  'postgres://pelada:pelada@localhost',
  'http://www.w3.org/2000/svg',
  'http://www.w3.org/1999/xlink',
  'http://json-schema.org/',
  'https://json-schema.org/',
  'https://schemastore.org/',
  'https://json.schemastore.org/',
  'https://biomejs.dev/',
  'https://developers.cloudflare.com/',
  'https://pnpm.io/',
];

const arquivos = arquivosVersionados(RAIZ, (c) => ESCOPO.test(c) && !FORA.test(c));
const achados = procurar(arquivos, URL_ABSOLUTA).filter(
  (a) => !EXCECOES.some((excecao) => a.includes(excecao)),
);
encerrar(achados, 'URL absoluta no código (G-18)');
