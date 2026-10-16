import { describe, expect, it } from 'vitest';
import { emTransacao } from '../../src/infraestrutura/db/index.js';
import * as partidas from '../../src/infraestrutura/db/repositorios/partidas.js';
import { JogadorForaDoGrupo, PartidaDuplicada } from '../../src/infraestrutura/db/repositorios/partidas.js';
import { usarDb } from '../apoio/db-teste.js';
import { criarConta } from '../apoio/fabricas/contas.js';
import { criarJogador } from '../apoio/fabricas/jogadores.js';
import { usarFabrica } from '../apoio/fabrica.js';
import { criarBase } from '../apoio/sql-dados.js';

const fabrica = usarFabrica();
const abrir = usarDb(fabrica);
const AGORA = new Date('2026-10-16T12:00:00Z');
const MAIS_TARDE = new Date('2026-10-17T12:00:00Z');

async function cenario() {
  const db = await abrir();
  const base = await criarBase(db, fabrica);
  const a = await criarJogador(db, base.grupo.id, base.contaId);
  const b = await criarJogador(db, base.grupo.id, base.contaId);
  const c = await criarJogador(db, base.grupo.id, base.contaId);
  return { db, base, a, b, c };
}

describe('repositório de partidas', () => {
  it('criar guarda as presenças, autor e momento; mesma data duplica no grupo mas não em outro', async () => {
    const { db, base, a, b, c } = await cenario();
    const dados = {
      data: '2026-10-15',
      choveu: true,
      presencas: [
        { jogadorId: a, situacao: 'presente' as const },
        { jogadorId: b, situacao: 'lesionado' as const },
        { jogadorId: c, situacao: 'expulso' as const },
      ],
      autor: base.contaId,
      agora: AGORA,
    };
    await emTransacao(db, (tx) => partidas.criar(tx, base.grupo.id, dados));
    const p = await partidas.porData(db, base.grupo.id, '2026-10-15');
    expect(p).toMatchObject({ choveu: true, alteradaPor: 'Conta de Teste', alteradaEm: AGORA });
    expect(p?.presencas).toHaveLength(3);
    await expect(emTransacao(db, (tx) => partidas.criar(tx, base.grupo.id, dados))).rejects.toBeInstanceOf(
      PartidaDuplicada,
    );
    await expect(
      emTransacao(db, (tx) => partidas.criar(tx, base.outroGrupo.id, { ...dados, presencas: [] })),
    ).resolves.toBeTypeOf('string');
  });

  it('jogador de outro grupo desfaz a transação inteira', async () => {
    const { db, base, a } = await cenario();
    const alheio = await criarJogador(db, base.outroGrupo.id, base.contaId);
    await expect(
      emTransacao(db, (tx) =>
        partidas.criar(tx, base.grupo.id, {
          data: '2026-10-08',
          choveu: false,
          presencas: [
            { jogadorId: a, situacao: 'presente' },
            { jogadorId: alheio, situacao: 'presente' },
          ],
          autor: base.contaId,
          agora: AGORA,
        }),
      ),
    ).rejects.toBeInstanceOf(JogadorForaDoGrupo);
    expect(await partidas.porData(db, base.grupo.id, '2026-10-08')).toBeNull();
  });

  it('porMes: inclui o último dia, exclui o dia 1 seguinte, conta e ordena', async () => {
    const { db, base, a, b } = await cenario();
    const nova = (data: string, presencas: partidas.PresencaGravada[]) =>
      emTransacao(db, (tx) =>
        partidas.criar(tx, base.grupo.id, { data, choveu: false, presencas, autor: base.contaId, agora: AGORA }),
      );
    await nova('2026-10-01', [{ jogadorId: a, situacao: 'presente' }]);
    await nova('2026-10-31', [
      { jogadorId: a, situacao: 'presente' },
      { jogadorId: b, situacao: 'expulso' },
    ]);
    await nova('2026-11-01', [{ jogadorId: a, situacao: 'presente' }]);
    const outubro = await partidas.porMes(db, base.grupo.id, '2026-10');
    expect(outubro.map((p) => p.data)).toEqual(['2026-10-31', '2026-10-01']);
    expect(outubro[0]?.contagem).toEqual({ presentes: 1, lesionados: 0, expulsos: 1 });
    expect(await partidas.porMes(db, base.grupo.id, '2026-09')).toEqual([]);
    expect((await partidas.historicoAte(db, base.grupo.id, '2026-10-31')).partidas).toHaveLength(2);
    expect((await partidas.historicoAte(db, base.grupo.id, '2026-11-01')).presencas).toHaveLength(4);
  });

  it('substituir troca choveu, presenças e autor; data inexistente dá false', async () => {
    const { db, base, a, b } = await cenario();
    const outro = await criarConta(db, fabrica, { nome: 'Segundo Autor' });
    await emTransacao(db, (tx) =>
      partidas.criar(tx, base.grupo.id, {
        data: '2026-10-15',
        choveu: false,
        presencas: [{ jogadorId: a, situacao: 'presente' }],
        autor: base.contaId,
        agora: AGORA,
      }),
    );
    const ok = await emTransacao(db, (tx) =>
      partidas.substituir(tx, base.grupo.id, '2026-10-15', {
        choveu: true,
        presencas: [{ jogadorId: b, situacao: 'lesionado' }],
        autor: outro.id,
        agora: MAIS_TARDE,
      }),
    );
    expect(ok).toBe(true);
    const p = await partidas.porData(db, base.grupo.id, '2026-10-15');
    expect(p).toMatchObject({ choveu: true, alteradaPor: 'Segundo Autor' });
    expect(p?.presencas).toEqual([{ jogadorId: b, situacao: 'lesionado' }]);
    expect(
      await emTransacao(db, (tx) =>
        partidas.substituir(tx, base.grupo.id, '2026-01-01', {
          choveu: false,
          presencas: [],
          autor: outro.id,
          agora: AGORA,
        }),
      ),
    ).toBe(false);
  });

  it('excluir e mesDaPrimeiraPartida', async () => {
    const { db, base, a } = await cenario();
    expect(await partidas.mesDaPrimeiraPartida(db, base.grupo.id)).toBeNull();
    for (const data of ['2026-08-06', '2026-09-03']) {
      await emTransacao(db, (tx) =>
        partidas.criar(tx, base.grupo.id, {
          data,
          choveu: false,
          presencas: [{ jogadorId: a, situacao: 'presente' }],
          autor: base.contaId,
          agora: AGORA,
        }),
      );
    }
    expect(await partidas.mesDaPrimeiraPartida(db, base.grupo.id)).toBe('2026-08');
    expect(await emTransacao(db, (tx) => partidas.excluir(tx, base.grupo.id, '2026-08-06'))).toBe(true);
    expect(await emTransacao(db, (tx) => partidas.excluir(tx, base.grupo.id, '2026-08-06'))).toBe(false);
    expect(await partidas.mesDaPrimeiraPartida(db, base.grupo.id)).toBe('2026-09');
    expect((await partidas.historicoAte(db, base.grupo.id, '2026-12-31')).presencas).toHaveLength(1);
  });
});
