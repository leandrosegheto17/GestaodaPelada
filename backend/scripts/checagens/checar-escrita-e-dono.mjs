import { arquivosVersionados, encerrar } from './arquivos.mjs';

// G-11: o papel de dono nunca é escrito por rota. Só backend/scripts/, as migrações, o repositório de
// contas (função criarContaDono, travada por lint) e os testes podem escrever `e_dono`/`eDono`.
const RAIZ = process.argv[2] ?? process.cwd();
const CODIGO = /\.(ts|tsx|js|mjs|sql)$/;
const FORA = /^(\.md|\.claude)\/|\/node_modules\/|^backend\/scripts\/|\/migracoes\/|(^|\/)test\/|\.test\.[a-z]+$/;
const CONTAS = /(^|\/)backend\/api\/src\/infraestrutura\/db\/repositorios\/contas\.ts$/;
const CRIAR_CONTA_DONO = /^export\s+async\s+function\s+criarContaDono\b[\s\S]*?^\}/m;
const ESCRITA =
  /\b(insert|update|upsert)\b|\bset\b|\bvalues\b|\.set\(|\.values\(|insertinto|updatetable|on\s+conflict/i;
const CHAVE_CALCULADA = /['"`]e_['"`]\s*\+|['"`]e['"`]\s*\+\s*['"`]_?dono/i;

function semComentarios(texto) {
  return texto
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
    .replace(/--[^\n]*/g, '');
}

const arquivos = arquivosVersionados(RAIZ, (c) => CODIGO.test(c) && !FORA.test(c));
const achados = [];
for (const { caminho, texto } of arquivos) {
  let limpo = semComentarios(texto);
  if (CONTAS.test(caminho)) {
    limpo = limpo.replace(CRIAR_CONTA_DONO, (m) => m.replace(/[^\n]/g, ' '));
  }
  if (CHAVE_CALCULADA.test(limpo)) achados.push(`${caminho}:1: chave calculada que forma e_dono`);
  for (const m of limpo.matchAll(/e_?dono/gi)) {
    const antes = limpo.slice(0, m.index);
    const trecho = antes.slice(Math.max(antes.lastIndexOf(';'), 0));
    if (ESCRITA.test(trecho)) {
      const linha = limpo.slice(0, m.index).split('\n').length;
      achados.push(`${caminho}:${linha}: escrita de e_dono fora de backend/scripts e das migrações`);
    }
  }
}
console.log(`${arquivos.length} arquivo(s) conferido(s).`);
encerrar(achados, 'Escrita do papel de dono fora do lugar permitido (G-11)');
