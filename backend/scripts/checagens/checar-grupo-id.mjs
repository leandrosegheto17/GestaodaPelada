import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import ts from 'typescript';
import { encerrar, falharFechado } from './arquivos.mjs';

const PASTA = resolve(
  process.argv[2] ?? join(import.meta.dirname, '../../api/src/infraestrutura/db/repositorios'),
);
const EXCECOES_JSON = resolve(
  process.argv[3] ?? join(import.meta.dirname, 'grupo-id-excecoes.json'),
);
const TIPOS_EXECUTOR = new Set(['Db', 'Tx', 'ExecutorDb']);

if (!existsSync(PASTA) || !statSync(PASTA).isDirectory()) {
  falharFechado(`pasta de repositórios ausente: ${PASTA}`);
}

function listar(pasta) {
  return readdirSync(pasta, { withFileTypes: true }).flatMap((e) => {
    const caminho = join(pasta, e.name);
    if (e.isDirectory()) return listar(caminho);
    return e.name.endsWith('.ts') && !e.name.endsWith('.test.ts') ? [caminho] : [];
  });
}

let excecoes;
try {
  excecoes = existsSync(EXCECOES_JSON) ? JSON.parse(readFileSync(EXCECOES_JSON, 'utf8')) : [];
} catch (erro) {
  falharFechado(`exceções ilegíveis (${erro.message})`);
}
const usadas = new Set();
const excecaoDe = (arquivo, funcao) => {
  const indice = excecoes.findIndex(
    (e) => e.arquivo === arquivo && (e.funcao === undefined || e.funcao === funcao),
  );
  if (indice >= 0) usadas.add(indice);
  return indice >= 0;
};

const arquivos = listar(PASTA);
const programa = ts.createProgram(arquivos, {
  noEmit: true,
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  allowImportingTsExtensions: true,
  skipLibCheck: true,
});
const sintaxe = programa.getSyntacticDiagnostics();
if (sintaxe.length > 0) {
  falharFechado(`erro de sintaxe em ${sintaxe[0]?.file?.fileName ?? 'arquivo desconhecido'}`);
}
const verificador = programa.getTypeChecker();

function funcaoDe(declaracao) {
  if (ts.isFunctionDeclaration(declaracao) || ts.isMethodDeclaration(declaracao)) return declaracao;
  if (ts.isVariableDeclaration(declaracao) && declaracao.initializer) {
    const inicial = declaracao.initializer;
    if (ts.isArrowFunction(inicial) || ts.isFunctionExpression(inicial)) return inicial;
  }
  if (ts.isExportAssignment(declaracao)) {
    const e = declaracao.expression;
    if (ts.isArrowFunction(e) || ts.isFunctionExpression(e)) return e;
  }
  return null;
}

function problemaDosParametros(funcao) {
  const parametros = [...funcao.parameters];
  const primeiro = parametros[0];
  if (primeiro?.type && TIPOS_EXECUTOR.has(primeiro.type.getText())) parametros.shift();
  const alvo = parametros[0];
  if (!alvo) return 'sem parâmetro grupoId';
  if (alvo.dotDotDotToken) return 'parâmetro rest no lugar de grupoId';
  if (!ts.isIdentifier(alvo.name)) return 'grupoId desestruturado';
  if (alvo.name.text !== 'grupoId')
    return `1º parâmetro de negócio é "${alvo.name.text}", não grupoId`;
  return null;
}

const achados = [];
for (const caminho of arquivos) {
  const fonte = programa.getSourceFile(caminho);
  if (!fonte) falharFechado(`não foi possível analisar ${caminho}`);
  const modulo = verificador.getSymbolAtLocation(fonte);
  if (!modulo) continue;
  const rel = relative(PASTA, caminho).replaceAll('\\', '/');
  for (const exportado of verificador.getExportsOfModule(modulo)) {
    const real =
      exportado.flags & ts.SymbolFlags.Alias ? verificador.getAliasedSymbol(exportado) : exportado;
    if (!(real.flags & ts.SymbolFlags.Value)) continue;
    for (const declaracao of real.declarations ?? []) {
      const funcao = funcaoDe(declaracao);
      if (!funcao) continue;
      const donoRel = relative(PASTA, declaracao.getSourceFile().fileName).replaceAll('\\', '/');
      if (donoRel !== rel) continue; // reexportada: avaliada no arquivo de origem
      if (excecaoDe(rel, exportado.name)) continue;
      const problema = problemaDosParametros(funcao);
      if (problema) {
        const { line } = fonte.getLineAndCharacterOfPosition(declaracao.getStart());
        achados.push(`${rel}:${line + 1}: ${exportado.name}: ${problema}`);
      }
    }
  }
}

excecoes.forEach((e, i) => {
  if (!usadas.has(i)) achados.push(`${EXCECOES_JSON}: exceção sem correspondência (${e.arquivo})`);
  if (!e.motivo) achados.push(`${EXCECOES_JSON}: exceção sem motivo (${e.arquivo})`);
});

console.log(`${arquivos.length} arquivo(s) de repositório conferido(s).`);
encerrar(achados, 'Função de repositório sem grupoId como 1º parâmetro de negócio (G-03)');
