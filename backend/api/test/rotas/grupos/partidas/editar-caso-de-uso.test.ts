import { describe, expect, it } from 'vitest';
import { PartidaNaoEncontrada, editarPartida } from '../../../../src/aplicacao/partidas/editar.js';
import { MarcacaoInvalida } from '../../../../src/aplicacao/partidas/presencas.js';
import { kyselyDe } from '../../../../src/infraestrutura/db/cliente.js';
import * as jogadores from '../../../../src/infraestrutura/db/repositorios/jogadores.js';
import { montarCenario } from '../../../apoio/cenario-acesso.js';
import { usarDbDoWorker } from '../../../apoio/db-worker.js';
import { criarPartida } from '../../../apoio/fabricas/partidas.js';
import { criarJogador } from '../../../apoio/fabricas/jogadores.js';
import { usarFabrica } from '../../../apoio/fabrica.js';
import { AGORA_TESTE, HOJE_TESTE, diaRelativo } from '../../../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);
const ANTES = new Date(AGORA_TESTE.getTime() - 86_400_000);

async function base() {
  const db = await abrir();
  const cen = await montarCenario(db, fabrica);
  const g = cen.grupoA.id;
  const entrada = diaRelativo(-60);
  const p = await criarJogador(db, g, cen.adminA.id, { apelido: 'Pedro', dataEntrada: entrada });
  const a = await criarJogador(db, g, cen.adminA.id, { apelido: 'Alex', dataEntrada: entrada });
  const l = await criarJogador(db, g, cen.adminA.id, { apelido: 'Luis', dataEntrada: entrada });
  const alheio = await criarJogador(db, cen.grupoB.id, cen.adminB.id, { apelido: 'Alheio' });
  const data = diaRelativo(-3);
  await criarPartida(db, g, data, cen.adminB.id, {
    choveu: false,
    agora: ANTES,
    presencas: [
      { jogadorId: p, situacao: 'presente' },
      { jogadorId: a, situacao: 'presente' },
    ],
  });
  const contexto = { autorContaId: cen.adminA.id, agora: AGORA_TESTE, hoje: HOJE_TESTE };
  return { db, cen, g, p, a, l, alheio, data, contexto };
}

async function estado(db: Awaited<ReturnType<typeof abrir>>, g: string) {
  const banco = kyselyDe(db);
  const [partida] = await banco
    .selectFrom('partidas')
    .select(['choveu', 'criada_por', 'criada_em', 'alterada_por', 'alterada_em'])
    .where('grupo_id', '=', g)
    .execute();
  const presencas = await banco
    .selectFrom('presencas')
    .select(['jogador_id', 'situacao'])
    .where('grupo_id', '=', g)
    .orderBy('jogador_id')
    .execute();
  return { partida: partida!, presencas };
}

describe('editarPartida (workerd)', () => {
  it('substitui choveu e presenças, mantém criada_* e audita com autor e momento', async () => {
    const { db, cen, g, p, a, l, data, contexto } = await base();
    const antes = await estado(db, g);
    const r = await editarPartida(
      db,
      g,
      data,
      {
        choveu: true,
        marcacoes: [
          { jogadorId: p, situacao: 'expulso' },
          { jogadorId: a, situacao: 'ausente' },
          { jogadorId: l, situacao: 'lesionado' },
        ],
      },
      contexto,
    );
    expect(r.choveu).toBe(true);
    expect(r.alteradaPor).toBe('Admin A');
    expect(r.alteradaEm).toBe(AGORA_TESTE.toISOString());
    const depois = await estado(db, g);
    expect(depois.partida.choveu).toBe(true);
    expect(depois.partida.alterada_por).toBe(cen.adminA.id);
    expect(depois.partida.alterada_em.getTime()).toBe(AGORA_TESTE.getTime());
    expect(depois.partida.criada_por).toBe(antes.partida.criada_por);
    expect(depois.partida.criada_em.getTime()).toBe(antes.partida.criada_em.getTime());
    expect(Object.fromEntries(depois.presencas.map((x) => [x.jogador_id, x.situacao]))).toEqual({
      [p]: 'expulso',
      [l]: 'lesionado',
    });
    const aud = await kyselyDe(db)
      .selectFrom('auditoria')
      .select(['autor_conta_id', 'momento', 'entidade_id', 'resumo'])
      .where('grupo_id', '=', g)
      .where('acao', '=', 'partida_editada')
      .execute();
    expect(aud).toHaveLength(1);
    expect(aud[0]).toMatchObject({ autor_conta_id: cen.adminA.id, entidade_id: data });
    expect(aud[0]!.resumo).toMatchObject({ data, choveu: true, presentes: 0, expulsos: 1, lesionados: 1 });
    expect(new Date(aud[0]!.momento).getTime()).toBe(AGORA_TESTE.getTime());
  });

  it('jogador inativo hoje mas ativo na data da partida é aceito', async () => {
    const { db, g, a, data, contexto } = await base();
    expect(await jogadores.inativar(db, g, a, diaRelativo(-1))).toBe('ok');
    await editarPartida(db, g, data, { choveu: false, marcacoes: [{ jogadorId: a, situacao: 'presente' }] }, contexto);
    expect((await estado(db, g)).presencas).toEqual([{ jogador_id: a, situacao: 'presente' }]);
  });

  it('inativo na data ou de outro grupo: MarcacaoInvalida e nada alterado', async () => {
    const { db, cen, g, alheio, data, contexto } = await base();
    const tarde = await criarJogador(db, g, cen.adminA.id, { apelido: 'Tarde', dataEntrada: diaRelativo(-1) });
    const antes = await estado(db, g);
    for (const jogadorId of [tarde, alheio]) {
      await expect(
        editarPartida(db, g, data, { choveu: true, marcacoes: [{ jogadorId, situacao: 'presente' }] }, contexto),
      ).rejects.toBeInstanceOf(MarcacaoInvalida);
    }
    expect(await estado(db, g)).toEqual(antes);
  });

  it('data sem partida lança PartidaNaoEncontrada e não audita', async () => {
    const { db, g, contexto } = await base();
    await expect(
      editarPartida(db, g, diaRelativo(-10), { choveu: true, marcacoes: [] }, contexto),
    ).rejects.toBeInstanceOf(PartidaNaoEncontrada);
    const aud = await kyselyDe(db).selectFrom('auditoria').select('id').where('acao', '=', 'partida_editada').execute();
    expect(aud).toEqual([]);
  });

  it('falha na auditoria desfaz choveu e presenças', async () => {
    const { db, g, l, data, contexto } = await base();
    const antes = await estado(db, g);
    await expect(
      editarPartida(
        db,
        g,
        data,
        { choveu: true, marcacoes: [{ jogadorId: l, situacao: 'presente' }] },
        contexto,
        async () => {
          throw new Error('falha forçada');
        },
      ),
    ).rejects.toThrow('falha forçada');
    expect(await estado(db, g)).toEqual(antes);
  });
});
