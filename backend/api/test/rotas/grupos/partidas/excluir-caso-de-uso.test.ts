import { describe, expect, it } from 'vitest';
import { PartidaNaoEncontrada } from '../../../../src/aplicacao/partidas/editar.js';
import { excluirPartida } from '../../../../src/aplicacao/partidas/excluir.js';
import { lancarPartida } from '../../../../src/aplicacao/partidas/lancar.js';
import { kyselyDe } from '../../../../src/infraestrutura/db/cliente.js';
import { montarCenario } from '../../../apoio/cenario-acesso.js';
import { usarDbDoWorker } from '../../../apoio/db-worker.js';
import { criarJogador } from '../../../apoio/fabricas/jogadores.js';
import { usarFabrica } from '../../../apoio/fabrica.js';
import { AGORA_TESTE, HOJE_TESTE, diaRelativo } from '../../../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);

async function base() {
  const db = await abrir();
  const cen = await montarCenario(db, fabrica);
  const g = cen.grupoA.id;
  const jogador = await criarJogador(db, g, cen.adminA.id, { apelido: 'Ana', dataEntrada: diaRelativo(-60) });
  const data = diaRelativo(-3);
  const contexto = { autorContaId: cen.adminA.id, agora: AGORA_TESTE, hoje: HOJE_TESTE };
  await lancarPartida(
    db,
    g,
    { data, choveu: false, marcacoes: [{ jogadorId: jogador, situacao: 'presente' }] },
    contexto,
  );
  return { db, cen, g, data, contexto };
}

describe('excluirPartida (workerd)', () => {
  it('apaga partida e presenças e audita com autor e momento do contexto', async () => {
    const { db, cen, g, data, contexto } = await base();
    await excluirPartida(db, g, data, contexto);
    const banco = kyselyDe(db);
    expect(await banco.selectFrom('partidas').select('id').where('grupo_id', '=', g).execute()).toEqual([]);
    expect(await banco.selectFrom('presencas').select('partida_id').where('grupo_id', '=', g).execute()).toEqual([]);
    const aud = await banco
      .selectFrom('auditoria')
      .select(['autor_conta_id', 'momento', 'entidade_id', 'resumo'])
      .where('grupo_id', '=', g)
      .where('acao', '=', 'partida_excluida')
      .execute();
    expect(aud).toHaveLength(1);
    expect(aud[0]).toMatchObject({ autor_conta_id: cen.adminA.id, entidade_id: data, resumo: { data } });
    expect(new Date(aud[0]!.momento).getTime()).toBe(AGORA_TESTE.getTime());
  });

  it('data sem partida lança PartidaNaoEncontrada e não audita', async () => {
    const { db, g, contexto } = await base();
    await expect(excluirPartida(db, g, diaRelativo(-10), contexto)).rejects.toBeInstanceOf(PartidaNaoEncontrada);
    const aud = await kyselyDe(db)
      .selectFrom('auditoria')
      .select('id')
      .where('grupo_id', '=', g)
      .where('acao', '=', 'partida_excluida')
      .execute();
    expect(aud).toEqual([]);
  });

  it('falha na auditoria desfaz a exclusão', async () => {
    const { db, g, data, contexto } = await base();
    await expect(
      excluirPartida(db, g, data, contexto, async () => {
        throw new Error('falha forçada');
      }),
    ).rejects.toThrow('falha forçada');
    const banco = kyselyDe(db);
    expect(await banco.selectFrom('partidas').select('id').where('grupo_id', '=', g).execute()).toHaveLength(1);
    expect(await banco.selectFrom('presencas').select('partida_id').where('grupo_id', '=', g).execute()).toHaveLength(
      1,
    );
  });
});
