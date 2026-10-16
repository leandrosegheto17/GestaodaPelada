import type { EscalacaoCorpo } from '@pelada/contrato';
import { describe, expect, it } from 'vitest';
import { confirmarEscalacao, idsDaComposicao } from '../../../src/aplicacao/simulador/confirmar-escalacao.js';
import { kyselyDe } from '../../../src/infraestrutura/db/cliente.js';
import * as escalacoes from '../../../src/infraestrutura/db/repositorios/escalacoes.js';
import { usarDb } from '../../apoio/db-teste.js';
import { criarJogador } from '../../apoio/fabricas/jogadores.js';
import { usarFabrica } from '../../apoio/fabrica.js';
import { criarBase } from '../../apoio/sql-dados.js';

const fabrica = usarFabrica();
const abrir = usarDb(fabrica);
const AGORA = new Date('2026-10-20T15:00:00Z');

const varios = (data: string, jogadores: string[]): EscalacaoCorpo => ({
  formato: 'varios_times',
  data,
  n: 2,
  composicao: { times: [{ jogadores }] },
});

async function cenario() {
  const db = await abrir();
  const base = await criarBase(db, fabrica);
  const a = await criarJogador(db, base.grupo.id, base.contaId);
  const b = await criarJogador(db, base.grupo.id, base.contaId);
  return { db, base, g: base.grupo.id, a, b };
}

const eventosDa = async (db: Awaited<ReturnType<typeof abrir>>, g: string) =>
  kyselyDe(db).selectFrom('eventos_uso').select(['tipo', 'data_partida']).where('grupo_id', '=', g).execute();

describe('confirmarEscalacao', () => {
  it('grava a escalação com autor e momento e um evento; confirmar de novo substitui e conta outro evento', async () => {
    const { db, base, g, a, b } = await cenario();
    const r = await confirmarEscalacao(db, g, varios('2026-10-22', [a]), { contaId: base.contaId, agora: AGORA });
    expect(r).toEqual({ ok: true, confirmada: { data: '2026-10-22', confirmadaEm: AGORA.toISOString() } });
    await confirmarEscalacao(db, g, varios('2026-10-22', [a, b]), { contaId: base.contaId, agora: AGORA });
    const lida = await escalacoes.porData(db, g, '2026-10-22');
    expect(lida).toMatchObject({ confirmadaPor: base.contaId, confirmadaEm: AGORA, k: null });
    expect(lida?.composicao).toEqual({ times: [{ jogadores: [a, b] }] });
    expect(await eventosDa(db, g)).toEqual([
      { tipo: 'escalacao_confirmada', data_partida: '2026-10-22' },
      { tipo: 'escalacao_confirmada', data_partida: '2026-10-22' },
    ]);
    await confirmarEscalacao(db, g, varios('2026-10-29', [a]), { contaId: base.contaId, agora: AGORA });
    expect(await escalacoes.porData(db, g, '2026-10-29')).not.toBeNull();
  });

  it('dois times: k numérico é gravado e "ilimitado" vira nulo', async () => {
    const { db, base, g, a, b } = await cenario();
    const corpo = (k: number | 'ilimitado'): EscalacaoCorpo => ({
      formato: 'dois_times',
      data: '2026-10-22',
      n: 2,
      k,
      composicao: {
        times: [
          { titulares: [{ id: a, so1oTempo: false }], entramNo2oTempo: [] },
          { titulares: [{ id: b, so1oTempo: true }], entramNo2oTempo: [] },
        ],
        naoEntra: [],
      },
    });
    await confirmarEscalacao(db, g, corpo(3), { contaId: base.contaId, agora: AGORA });
    expect((await escalacoes.porData(db, g, '2026-10-22'))?.k).toBe(3);
    await confirmarEscalacao(db, g, corpo('ilimitado'), { contaId: base.contaId, agora: AGORA });
    expect((await escalacoes.porData(db, g, '2026-10-22'))?.k).toBeNull();
  });

  it('falha ao registrar o evento desfaz a escalação e deixa a anterior intacta', async () => {
    const { db, base, g, a, b } = await cenario();
    await confirmarEscalacao(db, g, varios('2026-10-22', [a]), { contaId: base.contaId, agora: AGORA });
    await expect(
      confirmarEscalacao(
        db,
        g,
        varios('2026-10-22', [a, b]),
        { contaId: base.contaId, agora: AGORA },
        {
          registrarEvento: async () => {
            throw new Error('falha simulada');
          },
        },
      ),
    ).rejects.toThrow('falha simulada');
    expect((await escalacoes.porData(db, g, '2026-10-22'))?.composicao).toEqual({ times: [{ jogadores: [a] }] });
    expect(await eventosDa(db, g)).toHaveLength(1);
  });

  it('jogador de outro grupo, inexistente ou inativo na data: erro em composicao e nada gravado', async () => {
    const { db, base, g, a } = await cenario();
    const doOutro = await criarJogador(db, base.outroGrupo.id, base.contaId);
    for (const intruso of [doOutro, '00000000-0000-4000-8000-000000000000']) {
      const r = await confirmarEscalacao(db, g, varios('2026-10-22', [a, intruso]), {
        contaId: base.contaId,
        agora: AGORA,
      });
      expect(r.ok).toBe(false);
    }
    const antes = await confirmarEscalacao(db, g, varios('2025-12-31', [a]), { contaId: base.contaId, agora: AGORA });
    expect(antes.ok).toBe(false);
    expect(await escalacoes.porData(db, g, '2026-10-22')).toBeNull();
    expect(await eventosDa(db, g)).toEqual([]);
  });

  it('idsDaComposicao junta titulares, reservas e quem não entra', () => {
    const ids = idsDaComposicao({
      formato: 'dois_times',
      data: '2026-10-22',
      n: 2,
      k: 1,
      composicao: {
        times: [
          { titulares: [{ id: 'a', so1oTempo: false }], entramNo2oTempo: [{ id: 'b', so1oTempo: false }] },
          { titulares: [{ id: 'c', so1oTempo: false }], entramNo2oTempo: [] },
        ],
        naoEntra: ['d'],
      },
    });
    expect(ids).toEqual(['a', 'b', 'c', 'd']);
  });
});
