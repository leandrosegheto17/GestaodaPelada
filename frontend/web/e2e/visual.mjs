import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lerTelasAtivas } from './telas-ativas.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const PACOTE = join(AQUI, '..');
const RAIZ = join(PACOTE, '../..');
const CONFIG = join(RAIZ, '.md/mockup/telas.json');
const SCRIPT = join(RAIZ, '.claude/scripts/comparar-visual.mjs');

function falhar(mensagem) {
  console.error(mensagem);
  process.exit(2);
}

const idsValidos = [...new Set(JSON.parse(readFileSync(CONFIG, 'utf8')).telas.map((t) => t.id))];
const indice = process.argv.indexOf('--tela');
let telas;
try {
  telas =
    indice >= 0
      ? lerTelasAtivas((process.argv[indice + 1] ?? '').replaceAll(',', '\n'), idsValidos)
      : lerTelasAtivas(
          readFileSync(process.env.TELAS_ATIVAS_ARQUIVO ?? join(AQUI, 'telas-ativas.txt'), 'utf8'),
          idsValidos,
        );
} catch (erro) {
  falhar(erro.message);
}

if (telas.length === 0) {
  console.log('Nenhuma tela ativa: nada a comparar.');
  process.exit(0);
}
if (!existsSync(process.env.DIST_DIR ?? join(PACOTE, 'dist')))
  falhar('dist/ ausente: rode "pnpm --filter @pelada/web build" antes.');

const resultado = spawnSync(
  process.execPath,
  [
    SCRIPT,
    '--config',
    CONFIG,
    '--pacote',
    PACOTE,
    '--tela',
    telas.join(','),
    '--base-url',
    'http://localhost:4173',
    '--iniciar',
    'pnpm exec vite preview --port 4173 --strictPort',
    '--saida',
    join(AQUI, 'resultado'),
  ],
  { cwd: PACOTE, stdio: 'inherit' },
);
process.exit(resultado.status ?? 1);
