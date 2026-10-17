import { describe, expect, it, vi } from 'vitest';
import { kyselyDe } from '../../src/infraestrutura/db/cliente.js';
import { emTransacao } from '../../src/infraestrutura/db/index.js';
import * as partidas from '../../src/infraestrutura/db/repositorios/partidas.js';
import { JogadorForaDoGrupo, PartidaDuplicada } from '../../src/infraestrutura/db/repositorios/partidas.js';
import { usarDb } from '../apoio/db-teste.js';
import { criarConta } from '../apoio/fabricas/contas.js';
import { criarJogador } from '../apoio/fabricas/jogadores.js';
import { criarPartida } from '../apoio/fabricas/partidas.js';
import { usarFabrica } from '../apoio/fabrica.js';
import { AGORA_TESTE, HOJE_TESTE, diaRelativo } from '../apoio/relogio.js';
import { criarBase } from '../apoio/sql-dados.js';

const fabrica = usarFabrica();
const abrir = usarDb(fabrica);
const AGORA = AGORA_TESTE;
const MAIS_TARDE = new Date(AGORA.getTime() + 24 * 60 * 60 * 1000);

const HOJE = HOJE_TESTE;
const MES = HOJE.slice(0, 7);
const PRIMEIRO_DIA = `${MES}-01`;
const DIA_1_SEGUINTE = `${diaRelativo(31, PRIMEIRO_DIA).slice(0, 7)}-01`;
const ULTIMO_DIA = diaRelativo(-1, DIA_1_SEGUINTE);
const MES_ANTERIOR = diaRelativo(-1, PRIMEIRO_DIA).slice(0, 7);
const ONTEM = diaRelativo(-1);
const AMANHA = diaRelativo(1);

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
      data: HOJE,
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
    const p = await partidas.porData(db, base.grupo.id, HOJE);
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
          data: ONTEM,
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
    expect(await partidas.porData(db, base.grupo.id, ONTEM)).toBeNull();
  });

  it('porMes: inclui o último dia, exclui o dia 1 seguinte, conta e ordena', async () => {
    const { db, base, a, b } = await cenario();
    const nova = (data: string, presencas: partidas.PresencaGravada[]) =>
      criarPartida(db, base.grupo.id, data, base.contaId, { presencas });
    await nova(PRIMEIRO_DIA, [{ jogadorId: a, situacao: 'presente' }]);
    await nova(ULTIMO_DIA, [
      { jogadorId: a, situacao: 'presente' },
      { jogadorId: b, situacao: 'expulso' },
    ]);
    await nova(DIA_1_SEGUINTE, [{ jogadorId: a, situacao: 'presente' }]);
    const doMes = await partidas.porMes(db, base.grupo.id, MES);
    expect(doMes.map((p) => p.data)).toEqual([ULTIMO_DIA, PRIMEIRO_DIA]);
    expect(doMes[0]?.contagem).toEqual({ presentes: 1, lesionados: 0, expulsos: 1 });
    expect(await partidas.porMes(db, base.grupo.id, MES_ANTERIOR)).toEqual([]);
    expect((await partidas.historicoAte(db, base.grupo.id, ULTIMO_DIA)).partidas).toHaveLength(2);
    expect((await partidas.historicoAte(db, base.grupo.id, DIA_1_SEGUINTE)).presencas).toHaveLength(4);
  });

  it('substituir troca choveu, presenças e autor; data inexistente dá false', async () => {
    const { db, base, a, b } = await cenario();
    const outro = await criarConta(db, fabrica, { nome: 'Segundo Autor' });
    await criarPartida(db, base.grupo.id, HOJE, base.contaId, {
      presencas: [{ jogadorId: a, situacao: 'presente' }],
    });
    const ok = await emTransacao(db, (tx) =>
      partidas.substituir(tx, base.grupo.id, HOJE, {
        choveu: true,
        presencas: [{ jogadorId: b, situacao: 'lesionado' }],
        autor: outro.id,
        agora: MAIS_TARDE,
      }),
    );
    expect(ok).toBe(true);
    const p = await partidas.porData(db, base.grupo.id, HOJE);
    expect(p).toMatchObject({ choveu: true, alteradaPor: 'Segundo Autor' });
    expect(p?.presencas).toEqual([{ jogadorId: b, situacao: 'lesionado' }]);
    expect(
      await emTransacao(db, (tx) =>
        partidas.substituir(tx, base.grupo.id, AMANHA, {
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
    const primeira = diaRelativo(-70);
    const segunda = diaRelativo(-40);
    for (const data of [primeira, segunda]) {
      await criarPartida(db, base.grupo.id, data, base.contaId, {
        presencas: [{ jogadorId: a, situacao: 'presente' }],
      });
    }
    expect(await partidas.mesDaPrimeiraPartida(db, base.grupo.id)).toBe(primeira.slice(0, 7));
    expect(await emTransacao(db, (tx) => partidas.excluir(tx, base.grupo.id, primeira))).toBe(true);
    expect(await emTransacao(db, (tx) => partidas.excluir(tx, base.grupo.id, primeira))).toBe(false);
    expect(await partidas.mesDaPrimeiraPartida(db, base.grupo.id)).toBe(segunda.slice(0, 7));
    expect((await partidas.historicoAte(db, base.grupo.id, HOJE)).presencas).toHaveLength(1);
  });

  it('historicoAte não faz uma consulta por partida', async () => {
    const { db, base, a, b, c } = await cenario();
    const d = await criarJogador(db, base.grupo.id, base.contaId);
    const datas = [0, 1, 2, 3, 4].map((n) => diaRelativo(n - 10));
    for (const data of datas) {
      await criarPartida(db, base.grupo.id, data, base.contaId, {
        presencas: [a, b, c, d].map((jogadorId) => ({ jogadorId, situacao: 'presente' as const })),
      });
    }
    const espiao = vi.spyOn(kyselyDe(db).getExecutor(), 'executeQuery');
    const h = await partidas.historicoAte(db, base.grupo.id, datas[4]!);
    expect(espiao.mock.calls.length).toBeLessThanOrEqual(2);
    espiao.mockRestore();
    expect(h.partidas).toHaveLength(5);
    expect(h.presencas).toHaveLength(20);
    expect((await partidas.historicoAte(db, base.grupo.id, datas[2]!)).partidas).toHaveLength(3);
  });

  it('isolamento: o grupo A não lê, altera nem apaga a partida do grupo B', async () => {
    const { db, base } = await cenario();
    const dB = await criarJogador(db, base.outroGrupo.id, base.contaId);
    await criarPartida(db, base.outroGrupo.id, HOJE, base.contaId, {
      presencas: [{ jogadorId: dB, situacao: 'presente' }],
    });
    expect(await partidas.porData(db, base.grupo.id, HOJE)).toBeNull();
    expect(await partidas.porMes(db, base.grupo.id, MES)).toEqual([]);
    expect(
      await emTransacao(db, (tx) =>
        partidas.substituir(tx, base.grupo.id, HOJE, {
          choveu: true,
          presencas: [],
          autor: base.contaId,
          agora: MAIS_TARDE,
        }),
      ),
    ).toBe(false);
    expect(await emTransacao(db, (tx) => partidas.excluir(tx, base.grupo.id, HOJE))).toBe(false);
    expect((await partidas.historicoAte(db, base.grupo.id, HOJE)).presencas).toEqual([]);
    const intacta = await partidas.porData(db, base.outroGrupo.id, HOJE);
    expect(intacta).toMatchObject({ choveu: false });
    expect(intacta?.presencas).toHaveLength(1);
  });
});
