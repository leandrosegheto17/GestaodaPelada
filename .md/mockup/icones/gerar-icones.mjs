// Gera os PNG do ícone a partir de icone.svg com o Chrome/Edge headless instalado.
// Falha com código 1 se o SVG usar cor fora de tokens.css; com código 2 se não houver navegador.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const pasta = import.meta.dirname;
const svgCaminho = process.argv[2] ?? join(pasta, 'icone.svg');
const svg = readFileSync(svgCaminho, 'utf8');
const tokens = readFileSync(join(pasta, '..', 'tokens.css'), 'utf8').toUpperCase();

const foraDosTokens = [...new Set(svg.match(/#[0-9A-Fa-f]{6}\b/g) ?? [])].filter(
  (cor) => !tokens.includes(cor.toUpperCase()),
);
if (foraDosTokens.length) {
  console.error(`Cores fora de tokens.css: ${foraDosTokens.join(', ')}`);
  process.exit(1);
}
if (/<script|<foreignObject|href=|@import/i.test(svg)) {
  console.error('SVG com elemento ou referência proibida.');
  process.exit(1);
}

const candidatos = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];
const navegador = candidatos.find((c) => existsSync(c));
if (!navegador) {
  console.error('Chrome ou Edge não encontrado.');
  process.exit(2);
}

const saidas = [
  ['icone-192.png', 192],
  ['icone-512.png', 512],
  ['icone-512-maskable.png', 512],
  ['apple-touch-180.png', 180],
];
const temp = mkdtempSync(join(tmpdir(), 'icone-'));
try {
  const gerados = saidas.map(([nome, lado]) => {
    const html = join(temp, `${nome}.html`);
    writeFileSync(
      html,
      `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;overflow:hidden}svg{display:block;width:${lado}px;height:${lado}px}</style>${svg}`,
    );
    const png = join(temp, nome);
    execFileSync(navegador, [
      '--headless',
      '--disable-gpu',
      '--hide-scrollbars',
      `--screenshot=${png}`,
      `--window-size=${lado},${lado}`,
      pathToFileURL(html).href,
    ]);
    if (!existsSync(png)) throw new Error(`PNG não gerado: ${nome}`);
    return [png, join(pasta, nome)];
  });
  for (const [origem, destino] of gerados) renameSync(origem, destino);
  console.log(`ok: ${saidas.map(([n]) => n).join(', ')}`);
} catch (erro) {
  console.error(erro.message);
  process.exit(2);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
