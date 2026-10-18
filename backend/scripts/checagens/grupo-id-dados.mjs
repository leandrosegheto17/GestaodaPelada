import ts from 'typescript';

export const exprSemAsserts = (e) => {
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

// Predicados de "é dado": dependem do programa e do verificador de tipos da checagem.
export function criarAvaliadorDeDados(programa, verificador) {
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

  return { declaracaoEhDado };
}
