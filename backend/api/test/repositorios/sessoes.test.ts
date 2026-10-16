import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import * as sessoes from '../../src/infraestrutura/db/repositorios/sessoes.js';
import { DURACAO_SESSAO } from '../../src/infraestrutura/db/repositorios/sessoes.js';
import { usarDb } from '../apoio/db-teste.js';
import { criarConta } from '../apoio/fabricas/contas.js';
import { usarFabrica } from '../apoio/fabrica.js';
import { relogioFixo } from '../apoio/relogio.js';
import { codigoDoErro } from '../apoio/sql.js';

const fabrica = usarFabrica();
const abrir = usarDb();
const HORA = 60 * 60 * 1000;
const base = new Date(relogioFixo('2026-10-16').agoraIso());
const depois = (ms: number) => new Date(base.getTime() + ms);
const novoHash = () => new Uint8Array(randomBytes(32));

describe('repositório de sessões', () => {
  it('guarda exatamente os 32 bytes e recusa 31', async () => {
    const db = await abrir();
    const conta = await criarConta(db, fabrica);
    const hash = novoHash();
    const { expiraEm } = await sessoes.criar(db, {
      contaId: conta.id,
      tokenHash: hash,
      escopo: 'completo',
      agora: base,
    });
    expect(expiraEm).toEqual(depois(DURACAO_SESSAO));
    expect(await sessoes.buscarValidaEDeslizar(db, hash, base)).not.toBeNull();
    const curto = new Uint8Array(randomBytes(31));
    expect(
      await codigoDoErro(sessoes.criar(db, { contaId: conta.id, tokenHash: curto, escopo: 'completo', agora: base })),
    ).toBe('23514');
  });

  it('hash errado e sessão expirada não são válidos', async () => {
    const db = await abrir();
    const conta = await criarConta(db, fabrica);
    const hash = novoHash();
    const { expiraEm } = await sessoes.criar(db, {
      contaId: conta.id,
      tokenHash: hash,
      escopo: 'completo',
      agora: base,
    });
    expect(await sessoes.buscarValidaEDeslizar(db, novoHash(), base)).toBeNull();
    expect(await sessoes.buscarValidaEDeslizar(db, hash, expiraEm)).toBeNull();
  });

  it('só renova depois de 24 h sem uso', async () => {
    const db = await abrir();
    const conta = await criarConta(db, fabrica);
    const hash = novoHash();
    const { expiraEm } = await sessoes.criar(db, {
      contaId: conta.id,
      tokenHash: hash,
      escopo: 'completo',
      agora: base,
    });
    const aos23h = await sessoes.buscarValidaEDeslizar(db, hash, depois(23 * HORA));
    expect(aos23h).toMatchObject({ renovada: false, expiraEm });
    const aos25h = await sessoes.buscarValidaEDeslizar(db, hash, depois(25 * HORA));
    expect(aos25h?.renovada).toBe(true);
    expect(aos25h?.expiraEm).toEqual(depois(25 * HORA + DURACAO_SESSAO));
  });

  it('sessão usada no 29º dia continua válida', async () => {
    const db = await abrir();
    const conta = await criarConta(db, fabrica);
    const hash = novoHash();
    await sessoes.criar(db, {
      contaId: conta.id,
      tokenHash: hash,
      escopo: 'completo',
      agora: base,
    });
    const dia29 = depois(29 * 24 * HORA);
    expect((await sessoes.buscarValidaEDeslizar(db, hash, dia29))?.renovada).toBe(true);
    expect(await sessoes.buscarValidaEDeslizar(db, hash, depois(40 * 24 * HORA))).not.toBeNull();
  });

  it('troca de escopo, encerrar uma e encerrar todas', async () => {
    const db = await abrir();
    const a = await criarConta(db, fabrica);
    const b = await criarConta(db, fabrica);
    const h1 = novoHash();
    const h2 = novoHash();
    const hOutra = novoHash();
    const s1 = await sessoes.criar(db, {
      contaId: a.id,
      tokenHash: h1,
      escopo: 'troca_de_senha',
      agora: base,
    });
    const s2 = await sessoes.criar(db, {
      contaId: a.id,
      tokenHash: h2,
      escopo: 'completo',
      agora: base,
    });
    await sessoes.criar(db, { contaId: b.id, tokenHash: hOutra, escopo: 'completo', agora: base });

    await sessoes.trocarEscopo(db, s1.id, 'completo');
    expect((await sessoes.buscarValidaEDeslizar(db, h1, base))?.escopo).toBe('completo');

    expect(await sessoes.encerrar(db, h1)).toBe(true);
    expect(await sessoes.encerrar(db, h1)).toBe(false);

    const novo = novoHash();
    await sessoes.criar(db, { contaId: a.id, tokenHash: novo, escopo: 'completo', agora: base });
    expect(await sessoes.encerrarTodasDaConta(db, a.id, { exceto: s2.id })).toBe(1);
    expect(await sessoes.buscarValidaEDeslizar(db, h2, base)).not.toBeNull();
    expect(await sessoes.encerrarTodasDaConta(db, a.id)).toBe(1);
    expect(await sessoes.buscarValidaEDeslizar(db, hOutra, base)).not.toBeNull();
  });
});
