import { posix } from 'node:path';
import ts from 'typescript';
import { arquivosVersionados, encerrar } from './arquivos.mjs';
import { normalizarSql } from './sql-normalizado.mjs';

// G-26: período de jogador só muda por correção em transação, com o jogador travado e auditada.
// A escrita direta em `periodos_ativos` (SQL, Kysely, nome montado) é conferida pela regra ESLint
// `pelada/sem-escrita-periodo` (AST). Este script confere o que o ESLint não enxerga:
// (1) só as rotas listadas chegam, por qualquer cadeia de imports, a uma função do repositório que escreve
// período (grafo de módulos lido com o parser do TypeScript); (2) arquivos `.sql` fora das migrações.
const RAIZ = process.argv[2] ?? process.cwd();
const REPOS = 'backend/api/src/infraestrutura/db/repositorios/';
const ROTAS = 'backend/api/src/entrada/rotas/';
const ROTAS_QUE_ESCREVEM = new Set([
  `${ROTAS}grupos/jogadores/periodos-corrigir.ts`,
  `${ROTAS}grupos/jogadores/situacao.ts`,
  `${ROTAS}grupos/jogadores/criar.ts`,
  `${ROTAS}grupos/jogadores/inicio.ts`,
]);
const FUNCOES_QUE_ESCREVEM = new Set(['criar', 'inativar', 'reativar', 'alterarInicio']);

const CODIGO = /\.(ts|tsx|js|mjs)$/;
const SQL = /\.sql$/;
const FORA = /^(?!backend\/)|\/node_modules\/|\/migracoes\/|(^|\/)test\/|\.test\.[a-z]+$/;
// Aplicada ao SQL já normalizado (minúsculas, espaços colapsados, comentários e strings removidos).
const ESCRITA_SQL = /\b(?:insert into|update|merge into) (?:only )?(?:\w+\.)?periodos_ativos\b/;

const todos = arquivosVersionados(RAIZ, (c) => (CODIGO.test(c) || SQL.test(c)) && !FORA.test(c));
const achados = [];

for (const { caminho, texto } of todos) {
  if (!SQL.test(caminho)) continue;
  try {
    // O normalizador tira comentários e esvazia strings; o identificador entre aspas é preservado antes.
    const { texto: limpo, linhas } = normalizarSql(texto.replace(/"periodos_ativos"/gi, 'periodos_ativos'));
    const escrita = ESCRITA_SQL.exec(limpo);
    if (escrita) achados.push(`${caminho}:${linhas[escrita.index]}: escrita em periodos_ativos fora do repositório`);
  } catch (erro) {
    achados.push(`${caminho}:1: SQL não analisável (${erro.message})`);
  }
}

const arquivos = new Map(
  todos.filter(({ caminho }) => CODIGO.test(caminho)).map(({ caminho, texto }) => [caminho, texto]),
);

const semExtensao = (c) => c.replace(/\.(js|ts|tsx|mjs)$/, '');
function resolver(de, alvo) {
  if (!alvo.startsWith('.')) return null;
  const base = semExtensao(posix.join(posix.dirname(de), alvo));
  return [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find((c) => arquivos.has(c)) ?? null;
}

const textoDe = (no) => (no && ts.isStringLiteralLike(no) ? no.text : undefined);
const nomeDe = (no) => (ts.isIdentifier(no) || ts.isStringLiteralLike(no) ? no.text : undefined);

/**
 * Importações do arquivo (sem as só de tipo), lidas da árvore sintática:
 * `{ alvo, base, nomeados, apelidos, tudo }` — `tudo` = `export *` ou `import()`/`require()`, que levam o módulo inteiro.
 */
function importacoes(caminho) {
  const fonte = ts.createSourceFile(
    caminho,
    arquivos.get(caminho),
    ts.ScriptTarget.Latest,
    true,
    /\.tsx$/.test(caminho) ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const saida = [];
  const registrar = (alvo, parcial) => {
    const base = alvo.startsWith('.') ? semExtensao(posix.join(posix.dirname(caminho), alvo)) : alvo;
    saida.push({ alvo, base, arquivo: resolver(caminho, alvo), nomeados: [], apelidos: [], tudo: false, ...parcial });
  };
  const visitar = (no) => {
    if (ts.isImportDeclaration(no) && !no.importClause?.isTypeOnly) {
      const clausula = no.importClause;
      const ligacoes = clausula?.namedBindings;
      const nomeados =
        ligacoes && ts.isNamedImports(ligacoes)
          ? ligacoes.elements.filter((e) => !e.isTypeOnly).map((e) => (e.propertyName ?? e.name).text)
          : [];
      const apelidos = [];
      if (clausula?.name) apelidos.push(clausula.name.text);
      if (ligacoes && ts.isNamespaceImport(ligacoes)) apelidos.push(ligacoes.name.text);
      registrar(textoDe(no.moduleSpecifier) ?? '', { nomeados, apelidos });
    } else if (ts.isExportDeclaration(no) && no.moduleSpecifier && !no.isTypeOnly) {
      const nomeados =
        no.exportClause && ts.isNamedExports(no.exportClause)
          ? no.exportClause.elements.filter((e) => !e.isTypeOnly).map((e) => (e.propertyName ?? e.name).text)
          : [];
      registrar(textoDe(no.moduleSpecifier) ?? '', { nomeados, tudo: !no.exportClause });
    } else if (ts.isImportEqualsDeclaration(no) && ts.isExternalModuleReference(no.moduleReference)) {
      registrar(textoDe(no.moduleReference.expression) ?? '', { apelidos: [no.name.text] });
    } else if (ts.isCallExpression(no) && no.arguments.length > 0) {
      const dinamico = no.expression.kind === ts.SyntaxKind.ImportKeyword;
      const requisicao = ts.isIdentifier(no.expression) && no.expression.text === 'require';
      if ((dinamico || requisicao) && textoDe(no.arguments[0]) !== undefined) {
        registrar(textoDe(no.arguments[0]), { tudo: true });
      }
    }
    ts.forEachChild(no, visitar);
  };
  visitar(fonte);
  return { fonte, importacoes: saida };
}

/** O apelido (`jogadores`) é usado para chamar uma função que escreve período? */
function apelidoEscreve(fonte, apelido) {
  let achou = false;
  const visitar = (no) => {
    if (achou) return;
    if (ts.isPropertyAccessExpression(no) && ts.isIdentifier(no.expression) && no.expression.text === apelido) {
      achou = FUNCOES_QUE_ESCREVEM.has(no.name.text);
    } else if (ts.isElementAccessExpression(no) && ts.isIdentifier(no.expression) && no.expression.text === apelido) {
      achou = FUNCOES_QUE_ESCREVEM.has(textoDe(no.argumentExpression) ?? '');
    } else if (
      ts.isVariableDeclaration(no) &&
      no.initializer &&
      ts.isIdentifier(no.initializer) &&
      no.initializer.text === apelido &&
      ts.isObjectBindingPattern(no.name)
    ) {
      achou = no.name.elements.some((e) => FUNCOES_QUE_ESCREVEM.has(nomeDe(e.propertyName ?? e.name) ?? ''));
    }
    ts.forEachChild(no, visitar);
  };
  visitar(fonte);
  return achou;
}

/** O arquivo importa e usa uma função do repositório que escreve período? */
function escrevePeriodo(caminho) {
  const { fonte, importacoes: lista } = importacoes(caminho);
  return lista.some(({ base, nomeados, apelidos, tudo }) => {
    if (base === `${REPOS}periodos-corrigir`) return true;
    if (base !== `${REPOS}jogadores`) return false;
    if (tudo || nomeados.some((n) => FUNCOES_QUE_ESCREVEM.has(n))) return true;
    return apelidos.some((apelido) => apelidoEscreve(fonte, apelido));
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
    for (const { arquivo } of importacoes(atual).importacoes) {
      if (arquivo && !arquivo.startsWith(REPOS)) fila.push(arquivo);
    }
  }
}

console.log(`${arquivos.size} arquivo(s) conferido(s).`);
encerrar(achados, 'Escrita de período fora do lugar permitido (G-26)');
