// Roda os 3 casos do SPK-0001 contra o `wrangler dev --remote` (porta 8787).
const base = process.env.BASE ?? 'http://localhost:8787';
const lote = crypto.randomUUID().slice(0, 8);
const get = async (p) => {
  const r = await fetch(base + p);
  return { status: r.status, corpo: await r.json() };
};
const resultados = [];
const registrar = (nome, ok, detalhe) => {
  resultados.push(ok);
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${nome} ${detalhe ?? ''}`);
};

const c1 = await get(`/commit?m=${lote}-c1`);
registrar('Caso 1: commit visível para outra conexão', c1.corpo.ok, JSON.stringify(c1.corpo));
const c2 = await get(`/rollback?m=${lote}-c2`);
registrar('Caso 2: erro no meio não deixa resto', c2.corpo.ok, JSON.stringify(c2.corpo));

let falhas = 0;
for (let i = 0; i < 50; i++) {
  const r = await get(`/tx?m=${lote}-s`).catch(() => ({ corpo: { ok: false } }));
  if (!r.corpo.ok) falhas++;
}
const s = await get(`/contar?m=${lote}-s`);
registrar(
  'Caso 3a: 50 transações em série',
  falhas === 0 && s.corpo.linhas === 50,
  `falhas=${falhas} linhas=${s.corpo.linhas}`,
);

const par = await Promise.all(
  Array.from({ length: 20 }, () => get(`/tx?m=${lote}-p`).catch(() => ({ corpo: { ok: false } }))),
);
const p = await get(`/contar?m=${lote}-p`);
const falhasP = par.filter((r) => !r.corpo.ok).length;
registrar(
  'Caso 3b: 20 transações em paralelo (limite do origin = 20)',
  falhasP === 0 && p.corpo.linhas === 20,
  `falhas=${falhasP} linhas=${p.corpo.linhas}`,
);

console.log(resultados.every(Boolean) ? 'S-01: PASSOU' : 'S-01: FALHOU');
process.exit(resultados.every(Boolean) ? 0 : 1);
