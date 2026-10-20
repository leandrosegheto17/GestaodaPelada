import { arquivosVersionados, encerrar } from './arquivos.mjs';

// G-24: toda action de terceiros em workflow ou action composta é fixada por SHA de commit (40 hex), e o
// pnpm-workspace.yaml mantém a política de cadeia de suprimentos. Action local (`./...`) é aceita.
// O valor de `minimumReleaseAge` não é fixado aqui; só a presença da chave.
const RAIZ = process.argv[2] ?? process.cwd();
const CAMINHO_ACAO = /^\.github\/(workflows\/[^/]+\.ya?ml|actions\/[^/]+\/action\.ya?ml)$/i;
const PNPM = 'pnpm-workspace.yaml';
const USES = /^\s*(?:-\s*)?uses:\s*["']?([^\s"'#]+)/;
const FIXADA = /@[0-9a-f]{40}$/;
const POLITICA = [
  ['blockExoticSubdeps', /^blockExoticSubdeps:\s*true\s*(#.*)?$/m],
  ['trustPolicy', /^trustPolicy:\s*(?!off\b)["']?[\w-]+/m],
  ['minimumReleaseAge', /^minimumReleaseAge:\s*[1-9]\d*\s*(#.*)?$/m],
];

const arquivos = arquivosVersionados(RAIZ, (c) => CAMINHO_ACAO.test(c) || c === PNPM);
const achados = [];
for (const { caminho, texto } of arquivos) {
  if (caminho === PNPM) {
    for (const [chave, regex] of POLITICA)
      if (!regex.test(texto)) achados.push(`${caminho}:1: falta ${chave} (ausente ou desligado)`);
    continue;
  }
  texto.split(/\r?\n/).forEach((linha, i) => {
    const alvo = USES.exec(linha)?.[1];
    if (alvo && !alvo.startsWith('./') && !FIXADA.test(alvo))
      achados.push(`${caminho}:${i + 1}: ${linha.trim().slice(0, 120)}`);
  });
}
if (!arquivos.some((a) => a.caminho === PNPM)) achados.push(`${PNPM}:1: arquivo ausente`);
encerrar(achados, 'action sem SHA ou política do pnpm ausente (G-24)');
