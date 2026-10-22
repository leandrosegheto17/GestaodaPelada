import { readFileSync } from 'node:fs';
import { ARQUIVO_QUEBRAS, executarSnapshot, gerarInstantaneos } from './snapshot-lib.js';

// O script `snapshot` do package.json formata a pasta com o prettier da raiz logo depois desta gravação.
try {
  const { codigo, mensagens } = executarSnapshot(gerarInstantaneos(), readFileSync(ARQUIVO_QUEBRAS, 'utf8'));
  (codigo === 0 ? console.log : console.error)(mensagens.join('\n'));
  process.exit(codigo);
} catch (erro) {
  console.error(erro instanceof Error ? erro.message : 'Erro ao gerar o snapshot.');
  process.exit(2);
}
