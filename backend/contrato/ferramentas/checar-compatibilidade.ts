import { readFileSync } from 'node:fs';
import { ARQUIVO_QUEBRAS, conferir, gerarInstantaneos, lerSnapshot } from './snapshot-lib.js';

try {
  const relatorio = conferir(
    gerarInstantaneos(),
    lerSnapshot(),
    readFileSync(ARQUIVO_QUEBRAS, 'utf8'),
  );
  const problemas = [
    ...relatorio.eDono.map((c) => `campo de entrada eDono proibido: ${c}`),
    ...relatorio.quebras.map(
      (q) => `quebra em ${q.esquema}${q.caminho ? `.${q.caminho}` : ''}: ${q.mudanca}`,
    ),
  ];
  if (problemas.length === 0 && relatorio.desatualizados.length > 0) {
    problemas.push(
      `snapshot desatualizado (${relatorio.desatualizados.join(', ')}): rode "pnpm --filter @pelada/contrato snapshot"`,
    );
  }
  if (problemas.length > 0) {
    console.error(problemas.join('\n'));
    process.exit(1);
  }
  console.log('Contrato compatível com o snapshot.');
} catch (erro) {
  console.error(erro instanceof Error ? erro.message : 'Erro ao conferir o contrato.');
  process.exit(2);
}
