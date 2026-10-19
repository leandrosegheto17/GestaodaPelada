import { arquivosVersionados, encerrar } from './arquivos.mjs';

// G-15: o deploy só acontece no workflow `deploy.yml` (depois do dump e da migração). Nenhum outro arquivo
// executável pode publicar com o wrangler (`deploy`, `versions|pages|triggers deploy`, `publish`) nem usar a action
// `cloudflare/wrangler-action` nem `cloudflare/pages-action`. Varre scripts, workflows, Dockerfile, Makefile, justfile,
// .ps1/.cmd/.bat/.py; Markdown (DEPLOY.md) não é varrido.
// Risco residual aceito: ofuscação deliberada (bloco `run: |` com `wrangler` e `deploy` em linhas separadas, `$VAR`,
// array de argumentos, base64) não é detectada; o controle real é a revisão de PR e a aprovação do environment `producao`.
const RAIZ = process.argv[2] ?? process.cwd();
const FORA =
  /^(\.md|\.claude)\/|\/node_modules\/|^\.github\/workflows\/deploy\.yml$|^backend\/scripts\/checagens\/(checar-wrangler-deploy\.mjs|test\/checar-wrangler-deploy\.test\.mjs)$/;
const EXECUTAVEL =
  /(^\.github\/.*\.ya?ml$)|(^|\/)package\.json$|\.(sh|js|mjs|cjs|ts|ps1|cmd|bat|py)$|(^|\/)(Dockerfile(\.[^/]*)?|[^/]*\.Dockerfile|Makefile|justfile)$/;
// Aceita flags globais (e o valor delas) entre `wrangler` e o subcomando: `wrangler -c x.jsonc deploy`.
// Subcomandos de publicação: `deploy`, `versions|pages|triggers deploy` e o alias legado `publish`.
// O valor de uma flag pode vir entre aspas (`--config "a b"`).
const DEPLOY =
  /\bwrangler(?:@[\w.^~<>=*-]+|\.(?:cmd|exe))?(?:\s+-\S+(?:\s+(?:"[^"]*"|'[^']*'|[^\s"'-]\S*))?)*\s+(?:(?:versions|pages|triggers)\s+)?(?:deploy|publish)\b/;
const ACTION = /\buses:\s*["']?cloudflare\/(?:wrangler|pages)-action\b/;
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
    if (DEPLOY.test(junta) || ACTION.test(junta))
      achados.push(`${caminho}:${i + 1}: ${linhas[i].trim().slice(0, 120)}`);
  }
}
encerrar(achados, 'publicação com wrangler fora de .github/workflows/deploy.yml (G-15)');
