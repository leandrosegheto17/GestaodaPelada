import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  sugestaoDois,
  sugestaoVarios,
  type EntradaSimulador,
  type SugestaoDois,
  type SugestaoVarios,
} from '@pelada/contrato';

const RESPOSTAS = join(import.meta.dirname, '../../../../../.md/mockup/respostas');

/** Troca os ids do mockup (`j-toninho`) por uuids, que é o que a entrada do contrato exige. */
function comUuids(texto: string): { texto: string; ids: Map<string, string> } {
  const ids = new Map<string, string>();
  const trocado = texto.replace(/"(j-[a-z]+)"/g, (_, id: string) => {
    if (!ids.has(id)) ids.set(id, `00000000-0000-4000-8000-${String(ids.size + 1).padStart(12, '0')}`);
    return `"${ids.get(id)}"`;
  });
  return { texto: trocado, ids };
}

export function sugestaoDoisDeTeste(): { sugestao: SugestaoDois; entrada: EntradaSimulador; ids: Map<string, string> } {
  const { texto, ids } = comUuids(readFileSync(join(RESPOSTAS, 'simulador-sugestao-dois.json'), 'utf8'));
  const sugestao = sugestaoDois.parse(JSON.parse(texto));
  const todos = [...sugestao.times.flatMap((t) => [...t.titulares, ...t.entramNo2oTempo]), ...sugestao.naoEntra];
  const entrada: EntradaSimulador = {
    formato: 'dois_times',
    data: sugestao.data,
    n: sugestao.n,
    k: sugestao.k,
    aptos: todos.map((j) => ({ id: j.id, so1oTempo: 'so1oTempo' in j && j.so1oTempo === true })),
  };
  return { sugestao, entrada, ids };
}

export function sugestaoVariosDeTeste(): {
  sugestao: SugestaoVarios;
  entrada: EntradaSimulador;
  ids: Map<string, string>;
} {
  const { texto, ids } = comUuids(readFileSync(join(RESPOSTAS, 'simulador-sugestao-varios.json'), 'utf8'));
  const sugestao = sugestaoVarios.parse(JSON.parse(texto));
  const entrada: EntradaSimulador = {
    formato: 'varios_times',
    data: sugestao.data,
    n: sugestao.n,
    aptos: sugestao.times.flatMap((t) => t.jogadores.map((j) => ({ id: j.id }))),
  };
  return { sugestao, entrada, ids };
}
