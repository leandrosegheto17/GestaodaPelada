import { posix } from 'node:path';
import { arquivosVersionados, encerrar } from './arquivos.mjs';
import { LITERAL, semComentarios } from './texto-codigo.mjs';

// G-26: período de jogador só muda por correção em transação, com o jogador travado e auditada. Duas
// varreduras: (1) `periodos_ativos` só é escrita nos repositórios abaixo; (2) só as rotas listadas chegam
// a uma função do repositório que escreve período.
const RAIZ = process.argv[2] ?? process.cwd();
const REPOS = 'backend/api/src/infraestrutura/db/repositorios/';
const ROTAS = 'backend/api/src/entrada/rotas/';
const ESCRITORES_SQL = new Set([`${REPOS}jogadores.ts`, `${REPOS}periodos-corrigir.ts`]);
const ROTAS_QUE_ESCREVEM = new Set([
  `${ROTAS}grupos/jogadores/periodos-corrigir.ts`,
  `${ROTAS}grupos/jogadores/situacao.ts`,
  `${ROTAS}grupos/jogadores/criar.ts`,
  `${ROTAS}grupos/jogadores/inicio.ts`,
]);
const FUNCOES_QUE_ESCREVEM = ['criar', 'inativar', 'reativar', 'alterarInicio'];

const CODIGO = /\.(ts|tsx|js|mjs|sql)$/;
const FORA = /^(?!backend\/)|\/node_modules\/|\/migracoes\/|(^|\/)test\/|\.test\.[a-z]+$/;
const ESCRITA = /\b(insert|update|upsert)\b|insertinto|updatetable|\.set\(|\.values\(|on\s+conflict/i;
const NOME_MONTADO =
  /['"`]periodos['"`]\s*\+|periodos_?['"`]\s*\+\s*['"`]_?ativos|`periodos_?\$\{|=\s*['"`]periodos_ativos['"`]/i;
const IMPORTACAO =
  /(?:import|export)\s+(type\s+)?([\s\S]*?)\s*from\s*['"]([^'"]+)['"]|(?:import|require)\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

const arquivos = new Map(
  arquivosVersionados(RAIZ, (c) => CODIGO.test(c) && !FORA.test(c)).map(({ caminho, texto }) => [
    caminho,
    semComentarios(texto),
  ]),
);
const achados = [];

for (const [caminho, limpo] of arquivos) {
  if (ESCRITORES_SQL.has(caminho)) continue;
  const semPontoEmTexto = limpo.replace(LITERAL, (l) => l.replaceAll(';', ' '));
  const linhaDe = (i) => limpo.slice(0, i).split('\n').length;
  if (NOME_MONTADO.test(limpo)) achados.push(`${caminho}:1: nome de periodos_ativos montado fora do repositório`);
  for (const m of limpo.matchAll(/periodos_ativos/gi)) {
    const trecho = limpo.slice(Math.max(semPontoEmTexto.lastIndexOf(';', m.index), 0), m.index);
    if (ESCRITA.test(trecho))
      achados.push(`${caminho}:${linhaDe(m.index)}: escrita em periodos_ativos fora do repositório`);
  }
}

const semExtensao = (c) => c.replace(/\.(js|ts|tsx|mjs)$/, '');
function resolver(de, alvo) {
  if (!alvo.startsWith('.')) return null;
  const base = semExtensao(posix.join(posix.dirname(de), alvo));
  return [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find((c) => arquivos.has(c)) ?? null;
}

/** Os módulos que `caminho` importa: `{ alvo, clausula }`, com alvo resolvido a um arquivo ou à base sem extensão. */
function importacoes(caminho) {
  const limpo = arquivos.get(caminho);
  return [...limpo.matchAll(IMPORTACAO)].flatMap((m) => {
    const [, tipo, clausula = '', especificador, dinamico] = m;
    if (tipo) return [];
    const alvo = especificador ?? dinamico;
    const base = alvo.startsWith('.') ? semExtensao(posix.join(posix.dirname(caminho), alvo)) : alvo;
    return [{ alvo, base, clausula, arquivo: resolver(caminho, alvo), dinamico: dinamico !== undefined }];
  });
}

/** O arquivo importa e usa uma função do repositório que escreve período? */
function escrevePeriodo(caminho) {
  // Texto solto não é uso; a chave entre colchetes (`jogadores['inativar']`) é.
  const limpo = arquivos
    .get(caminho)
    .replace(LITERAL, (l, _a, i, tudo) => (/\[\s*$/.test(tudo.slice(0, i)) ? l : "''"));
  const funcoes = FUNCOES_QUE_ESCREVEM.join('|');
  return importacoes(caminho).some(({ base, clausula, dinamico }) => {
    if (base === `${REPOS}periodos-corrigir`) return true;
    if (base !== `${REPOS}jogadores`) return false;
    if (dinamico || clausula.trim() === '*') return true;
    const nomeados = /\{([\s\S]*)\}/.exec(clausula)?.[1] ?? '';
    if (nomeados.split(',').some((n) => FUNCOES_QUE_ESCREVEM.includes(n.trim().split(/\s+as\s+/)[0]))) return true;
    const apelidos = [...clausula.replace(/\{[\s\S]*\}/, '').matchAll(/(?:\*\s*as\s+)?([\w$]+)/g)].map((m) => m[1]);
    return apelidos.some(
      (n) =>
        new RegExp(String.raw`\b${n}\s*(?:\?\.|\.|\[\s*['"])\s*(?:${funcoes})\b`).test(limpo) ||
        new RegExp(String.raw`\{[^}]*\b(?:${funcoes})\b[^}]*\}\s*=\s*${n}\b`).test(limpo),
    );
  });
}

for (const rota of arquivos.keys()) {
  if (!rota.startsWith(ROTAS) || ROTAS_QUE_ESCREVEM.has(rota)) continue;
  const vistos = new Set();
  const fila = [rota];
  while (fila.length > 0) {
    const atual = fila.pop();
    if (vistos.has(atual)) continue;
    vistos.add(atual);
    if (escrevePeriodo(atual)) {
      achados.push(
        `${rota}:1: rota escreve período (via ${atual}); só periodos-corrigir, situacao, criar e inicio podem`,
      );
      break;
    }
    for (const { arquivo } of importacoes(atual)) {
      if (arquivo && !arquivo.startsWith(REPOS)) fila.push(arquivo);
    }
  }
}

console.log(`${arquivos.size} arquivo(s) conferido(s).`);
encerrar(achados, 'Escrita de período fora do lugar permitido (G-26)');
