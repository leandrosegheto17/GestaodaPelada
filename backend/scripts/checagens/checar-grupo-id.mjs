import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import ts from 'typescript';
import { encerrar, falharFechado } from './arquivos.mjs';
import { criarAvaliadorDeDados, exprSemAsserts } from './grupo-id-dados.mjs';

const PASTA = resolve(process.argv[2] ?? join(import.meta.dirname, '../../api/src/infraestrutura/db/repositorios'));
const EXCECOES_JSON = resolve(process.argv[3] ?? join(import.meta.dirname, 'grupo-id-excecoes.json'));
const TIPOS_EXECUTOR = new Set(['Db', 'Tx', 'ExecutorDb']);

if (!existsSync(PASTA) || !statSync(PASTA).isDirectory()) {
  falharFechado(`pasta de repositórios ausente: ${PASTA}`);
}

function listar(pasta) {
  return readdirSync(pasta, { withFileTypes: true }).flatMap((e) => {
    const caminho = join(pasta, e.name);
    if (e.isDirectory()) return listar(caminho);
    return /\.(ts|tsx|mts|cts)$/.test(e.name) && !/\.test\.[a-z]+$/.test(e.name) ? [caminho] : [];
  });
}
const relPasta = (caminho) => relative(PASTA, caminho).replaceAll('\\', '/');
const estaFora = (rel) => rel === '..' || rel.startsWith('../') || isAbsolute(rel);

let excecoes;
try {
  excecoes = existsSync(EXCECOES_JSON) ? JSON.parse(readFileSync(EXCECOES_JSON, 'utf8')) : [];
} catch (erro) {
  falharFechado(`exceções ilegíveis (${erro.message})`);
}
const usadas = new Set();
const excecaoDe = (arquivo, funcao) => {
  const indice = excecoes.findIndex((e) => e.arquivo === arquivo && (e.funcao === undefined || e.funcao === funcao));
  if (indice >= 0) usadas.add(indice);
  return indice >= 0;
};

const arquivos = listar(PASTA);
const avaliados = new Set(arquivos.map(relPasta));
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
const { declaracaoEhDado } = criarAvaliadorDeDados(programa, verificador);

function funcaoDe(declaracao) {
  if (ts.isFunctionDeclaration(declaracao) || ts.isMethodDeclaration(declaracao)) return declaracao;
  if (ts.isVariableDeclaration(declaracao) && declaracao.initializer) {
    const inicial = exprSemAsserts(declaracao.initializer);
    if (ts.isArrowFunction(inicial) || ts.isFunctionExpression(inicial)) return inicial;
  }
  if (ts.isExportAssignment(declaracao) && !declaracao.isExportEquals) {
    const e = exprSemAsserts(declaracao.expression);
    if (ts.isArrowFunction(e) || ts.isFunctionExpression(e)) return e;
  }
  return null;
}

const MOTIVO_NAO_ANALISAVEL = 'forma de export não analisável; use função declarada ou exceção com motivo';

const formaNaoAnalisavel = (declaracao) => (declaracaoEhDado(declaracao) ? null : MOTIVO_NAO_ANALISAVEL);

function problemaDosParametros(funcao) {
  const parametros = [...funcao.parameters];
  const primeiro = parametros[0];
  if (primeiro?.type && TIPOS_EXECUTOR.has(primeiro.type.getText())) parametros.shift();
  const alvo = parametros[0];
  if (!alvo) return 'sem parâmetro grupoId';
  if (alvo.dotDotDotToken) return 'parâmetro rest no lugar de grupoId';
  if (!ts.isIdentifier(alvo.name)) return 'grupoId desestruturado';
  if (alvo.name.text !== 'grupoId') return `1º parâmetro de negócio é "${alvo.name.text}", não grupoId`;
  return null;
}

const achados = [];
for (const caminho of arquivos) {
  const fonte = programa.getSourceFile(caminho);
  if (!fonte) falharFechado(`não foi possível analisar ${caminho}`);
  const modulo = verificador.getSymbolAtLocation(fonte);
  if (!modulo) continue;
  const rel = relative(PASTA, caminho).replaceAll('\\', '/');
  for (const instrucao of fonte.statements) {
    const equals = ts.isExportAssignment(instrucao) && instrucao.isExportEquals;
    if (equals && !excecaoDe(rel, 'export=')) {
      const { line } = fonte.getLineAndCharacterOfPosition(instrucao.getStart());
      achados.push(`${rel}:${line + 1}: export =: ${MOTIVO_NAO_ANALISAVEL}`);
    }
    if (!ts.isExportDeclaration(instrucao) || !instrucao.moduleSpecifier) continue;
    const alvo = ts.resolveModuleName(instrucao.moduleSpecifier.text, caminho, programa.getCompilerOptions(), ts.sys)
      .resolvedModule?.resolvedFileName;
    const destino = alvo && relPasta(alvo);
    const dentro = destino && !estaFora(destino);
    const naoAvaliado = dentro && !avaliados.has(destino);
    if ((!dentro || naoAvaliado) && !excecaoDe(rel, '*')) {
      const { line } = fonte.getLineAndCharacterOfPosition(instrucao.getStart());
      const onde = naoAvaliado ? 'arquivo da pasta fora da avaliação' : 'módulo fora da pasta';
      achados.push(`${rel}:${line + 1}: re-export de ${onde}: ${MOTIVO_NAO_ANALISAVEL}`);
    }
  }
  for (const exportado of verificador.getExportsOfModule(modulo)) {
    const real = exportado.flags & ts.SymbolFlags.Alias ? verificador.getAliasedSymbol(exportado) : exportado;
    if (!(real.flags & ts.SymbolFlags.Value) && (real.declarations ?? []).length) continue;
    const viaImportEquals = (exportado.declarations ?? []).some((d) => ts.isImportEqualsDeclaration(d));
    // Alias que não resolve a nenhuma declaração (módulo inexistente/fora do programa): fail-closed.
    const semDeclaracao = !(real.declarations ?? []).length;
    if (semDeclaracao && exportado.flags & ts.SymbolFlags.Alias && !excecaoDe(rel, exportado.name)) {
      achados.push(`${rel}: ${exportado.name}: ${MOTIVO_NAO_ANALISAVEL}`);
    }
    for (const declaracao of real.declarations ?? []) {
      const donoRel = relPasta(declaracao.getSourceFile().fileName);
      const naoAvaliado = !estaFora(donoRel) && !avaliados.has(donoRel);
      if (estaFora(donoRel) || naoAvaliado || viaImportEquals) {
        if (!excecaoDe(rel, exportado.name)) {
          const origem = exportado.declarations?.[0] ?? declaracao;
          const { line } = origem.getSourceFile().getLineAndCharacterOfPosition(origem.getStart());
          achados.push(`${rel}:${line + 1}: ${exportado.name}: ${MOTIVO_NAO_ANALISAVEL}`);
        }
        continue;
      }
      if (donoRel !== rel) continue; // reexportada: avaliada no arquivo de origem
      const funcao = funcaoDe(declaracao);
      const problema = funcao ? problemaDosParametros(funcao) : formaNaoAnalisavel(declaracao);
      if (problema && !excecaoDe(rel, exportado.name)) {
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
