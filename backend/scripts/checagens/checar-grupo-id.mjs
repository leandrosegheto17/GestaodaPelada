import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import ts from 'typescript';
import { encerrar, falharFechado } from './arquivos.mjs';

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
const exprSemAsserts = (e) => {
  let atual = e;
  while (
    ts.isParenthesizedExpression(atual) ||
    ts.isAsExpression(atual) ||
    ts.isSatisfiesExpression(atual) ||
    ts.isNonNullExpression(atual)
  ) {
    atual = atual.expression;
  }
  return atual;
};

const ehDadoLiteral = (e) =>
  ts.isLiteralExpression(e) ||
  e.kind === ts.SyntaxKind.TrueKeyword ||
  e.kind === ts.SyntaxKind.FalseKeyword ||
  e.kind === ts.SyntaxKind.NullKeyword ||
  (ts.isPrefixUnaryExpression(e) && ts.isLiteralExpression(e.operand)) ||
  (ts.isArrayLiteralExpression(e) && e.elements.every((x) => ehDadoLiteral(exprSemAsserts(x))));

const TIPOS_DADO = new Set([
  ts.SyntaxKind.StringKeyword,
  ts.SyntaxKind.NumberKeyword,
  ts.SyntaxKind.BooleanKeyword,
  ts.SyntaxKind.BigIntKeyword,
  ts.SyntaxKind.NullKeyword,
  ts.SyntaxKind.UndefinedKeyword,
]);
const ehTipoDado = (t) =>
  !!t &&
  (TIPOS_DADO.has(t.kind) ||
    ts.isLiteralTypeNode(t) ||
    (ts.isUnionTypeNode(t) && t.types.every(ehTipoDado)) ||
    (ts.isArrayTypeNode(t) && ehTipoDado(t.elementType)));

const ehObjetoDeDados = (e) =>
  e.properties.every(
    (p) =>
      ts.isPropertyAssignment(p) &&
      !ts.isComputedPropertyName(p.name) &&
      ts.isLiteralExpression(exprSemAsserts(p.initializer)),
  );

// Decisão pelo tipo: qualquer valor cujo tipo (em profundidade) tenha assinatura de chamada ou de
// construção, ou seja any/unknown/object, é comportamento e exige grupoId ou exceção.
function tipoInvocavel(tipo, local, vistos = new Set()) {
  if (vistos.has(tipo)) return false;
  vistos.add(tipo);
  const F = ts.TypeFlags;
  if (tipo.flags & (F.Any | F.Unknown | F.NonPrimitive | F.Instantiable)) return true;
  if (tipo.isUnionOrIntersection()) return tipo.types.some((t) => tipoInvocavel(t, local, vistos));
  if (!(tipo.flags & F.Object)) return false;
  if (tipo.getCallSignatures().length || tipo.getConstructSignatures().length) return true;
  if (tipo.objectFlags & ts.ObjectFlags.Reference) {
    // O argumento extra do fim é o tipo `this` das classes/interfaces, não um tipo declarado.
    const declarados = verificador.getTypeArguments(tipo).slice(0, tipo.target.typeParameters?.length ?? 0);
    if (declarados.some((t) => tipoInvocavel(t, local, vistos))) return true;
  }
  const decls = tipo.symbol?.declarations ?? [];
  if (decls.length > 0 && decls.every((x) => programa.isSourceFileDefaultLibrary(x.getSourceFile()))) return false;
  return membrosInvocaveis(tipo, local, vistos);
}
function membrosInvocaveis(tipo, local, vistos, filtro = () => true) {
  const daBiblioteca = (p) =>
    (p.declarations ?? []).length > 0 &&
    p.declarations.every((x) => programa.isSourceFileDefaultLibrary(x.getSourceFile()));
  const propriedades = verificador.getPropertiesOfType(tipo).filter((p) => filtro(p) && !daBiblioteca(p));
  return (
    propriedades.some((p) => tipoInvocavel(verificador.getTypeOfSymbolAtLocation(p, local), local, vistos)) ||
    verificador.getIndexInfosOfType(tipo).some((i) => tipoInvocavel(i.type, local, vistos))
  );
}
const tipoDoNo = (no, local) => {
  const simbolo = verificador.getSymbolAtLocation(no);
  return simbolo ? verificador.getTypeOfSymbolAtLocation(simbolo, local) : verificador.getTypeAtLocation(no);
};

// Lista de permitidos: só passa sem análise parâmetro a parâmetro o que for comprovadamente dado
// (literal, objeto só de literais, enum literal, classe sem herança nem função como membro).
// Qualquer outra forma de declaração exportada falha fechado.
const temDecorador = (n) => ts.canHaveDecorators(n) && (ts.getDecorators(n) ?? []).length > 0;
const argumentoSimples = (a) => ts.isIdentifier(a) || ehDadoLiteral(exprSemAsserts(a));
const ehSuperSimples = (s) =>
  ts.isExpressionStatement(s) &&
  ts.isCallExpression(s.expression) &&
  s.expression.expression.kind === ts.SyntaxKind.SuperKeyword &&
  s.expression.arguments.every(argumentoSimples);

// Construtor aceito: só parâmetros identificadores (propriedade ou não) com padrão literal e corpo
// vazio ou apenas `super(...)` com identificadores/literais.
function construtorEhDado(m) {
  const parametrosOk = m.parameters.every((p) => {
    if (temDecorador(p) || !ts.isIdentifier(p.name)) return false;
    const ehPropriedade = (ts.getModifiers(p) ?? []).length > 0;
    if (p.initializer) return ehDadoLiteral(exprSemAsserts(p.initializer));
    return !ehPropriedade || ehTipoDado(p.type);
  });
  return parametrosOk && (!m.body || m.body.statements.every(ehSuperSimples));
}

function membroDeClasseEhDado(m) {
  if (ts.isSemicolonClassElement(m)) return true;
  if (temDecorador(m) || (m.name && ts.isComputedPropertyName(m.name))) return false;
  if (ts.isIndexSignatureDeclaration(m)) return true;
  if (ts.isPropertyDeclaration(m)) {
    return m.initializer ? ehDadoLiteral(exprSemAsserts(m.initializer)) : ehTipoDado(m.type);
  }
  if (ts.isConstructorDeclaration(m)) return construtorEhDado(m);
  return false;
}

// Única herança aceita: `extends Error` com o Error global da biblioteca padrão.
function heranca(clausula) {
  if (clausula.token !== ts.SyntaxKind.ExtendsKeyword) return false;
  const [tipo] = clausula.types;
  if (clausula.types.length !== 1 || !ts.isIdentifier(tipo.expression) || tipo.typeArguments) return false;
  if (tipo.expression.text !== 'Error') return false;
  const simbolo = verificador.getSymbolAtLocation(tipo.expression);
  const decls = simbolo?.declarations ?? [];
  return decls.length > 0 && decls.every((x) => programa.isSourceFileDefaultLibrary(x.getSourceFile()));
}

function classeEhDado(d) {
  if (temDecorador(d) || !(d.heritageClauses ?? []).every(heranca) || !d.members.every(membroDeClasseEhDado)) {
    return false;
  }
  const simbolo = (d.name && verificador.getSymbolAtLocation(d.name)) || d.symbol;
  if (!simbolo) return false;
  const instancia = verificador.getDeclaredTypeOfSymbol(simbolo);
  const estatico = verificador.getTypeOfSymbolAtLocation(simbolo, d);
  const proprio = (p) => (p.declarations ?? []).some((x) => x.parent === d);
  return !(instancia && tipoInvocavel(instancia, d)) && !membrosInvocaveis(estatico, d, new Set(), proprio);
}

function declaracaoEhDado(d) {
  if (ts.isClassDeclaration(d)) return classeEhDado(d);
  if (ts.isEnumDeclaration(d)) {
    return d.members.every((m) => !m.initializer || ehDadoLiteral(exprSemAsserts(m.initializer)));
  }
  if (ts.isVariableDeclaration(d)) {
    const lista = d.parent;
    const somenteLeitura = ts.isVariableDeclarationList(lista) && (lista.flags & ts.NodeFlags.Const) !== 0;
    if (!d.initializer) return ehTipoDado(d.type) && ts.isIdentifier(d.name);
    // `as`/`satisfies` só valem se o tipo resultante também for dado (verificado abaixo).
    if (!somenteLeitura || !ts.isIdentifier(d.name)) return false;
    const e = exprSemAsserts(d.initializer);
    const literal = ts.isObjectLiteralExpression(e) ? ehObjetoDeDados(e) : ehDadoLiteral(e);
    return literal && !tipoInvocavel(tipoDoNo(d.name, d), d);
  }
  if (ts.isExportAssignment(d) && !d.isExportEquals) {
    const e = exprSemAsserts(d.expression);
    const literal = ts.isObjectLiteralExpression(e) ? ehObjetoDeDados(e) : ehDadoLiteral(e);
    return literal && !tipoInvocavel(verificador.getTypeAtLocation(d.expression), d);
  }
  return false;
}

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
