import { readFileSync } from 'node:fs';
import {
  ARQUIVO_QUEBRAS,
  conferir,
  gerarInstantaneos,
  gravar,
  lerSnapshot,
  temSnapshot,
} from './snapshot-lib.js';

try {
  const atual = gerarInstantaneos();
  if (temSnapshot()) {
    const relatorio = conferir(atual, lerSnapshot(), readFileSync(ARQUIVO_QUEBRAS, 'utf8'));
    const problemas = [
      ...relatorio.eDono.map((c) => `campo de entrada eDono proibido: ${c}`),
      ...relatorio.quebras.map(
        (q) => `quebra em ${q.esquema}${q.caminho ? `.${q.caminho}` : ''}: ${q.mudanca}`,
      ),
    ];
    if (problemas.length > 0) {
      console.error(
        `${problemas.join('\n')}\nNão regravo o snapshot: liste a quebra em QUEBRAS.md.`,
      );
      process.exit(1);
    }
  } else if (Object.values(atual).some((i) => i.direcao === 'entrada')) {
    const relatorio = conferir(atual, {}, readFileSync(ARQUIVO_QUEBRAS, 'utf8'));
    if (relatorio.eDono.length > 0) {
      console.error(`campo de entrada eDono proibido: ${relatorio.eDono.join(', ')}`);
      process.exit(1);
    }
  }
  gravar(atual);
  console.log(`Snapshot gravado (${Object.keys(atual).length} esquema(s)).`);
} catch (erro) {
  console.error(erro instanceof Error ? erro.message : 'Erro ao gerar o snapshot.');
  process.exit(2);
}
