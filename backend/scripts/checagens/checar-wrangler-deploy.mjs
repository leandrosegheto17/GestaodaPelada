import { arquivosVersionados, encerrar } from './arquivos.mjs';

// G-15: o deploy só acontece no workflow `deploy.yml` (depois do dump e da migração). Nenhum outro arquivo
// executável pode chamar `wrangler deploy` ou `wrangler versions deploy`. Markdown (DEPLOY.md) não é varrido.
const RAIZ = process.argv[2] ?? process.cwd();
const FORA =
  /^(\.md|\.claude)\/|\/node_modules\/|^\.github\/workflows\/deploy\.yml$|^backend\/scripts\/checagens\/(checar-wrangler-deploy\.mjs|test\/checar-wrangler-deploy\.test\.mjs)$/;
const EXECUTAVEL = /(^\.github\/.*\.ya?ml$)|(^|\/)package\.json$|\.(sh|js|mjs|cjs|ts)$/;
const DEPLOY = /\bwrangler(?:@[\w.^~<>=*-]+)?\s+(?:versions\s+)?deploy\b/;
const CONTINUA = /\\\s*$/;

const arquivos = arquivosVersionados(RAIZ, (c) => EXECUTAVEL.test(c) && !FORA.test(c));
const achados = [];
for (const { caminho, texto } of arquivos) {
  const linhas = texto.split(/\r?\n/);
  for (let i = 0; i < linhas.length; i += 1) {
    // Junta as linhas quebradas com a barra invertida para pegar `wrangler \` seguido de `deploy`.
    let junta = linhas[i];
    let j = i;
    while (CONTINUA.test(junta) && j + 1 < linhas.length) {
      j += 1;
      junta = `${junta.replace(CONTINUA, '')} ${linhas[j].trim()}`;
    }
    if (DEPLOY.test(junta)) achados.push(`${caminho}:${i + 1}: ${linhas[i].trim().slice(0, 120)}`);
  }
}
encerrar(achados, '`wrangler deploy` fora de .github/workflows/deploy.yml (G-15)');
