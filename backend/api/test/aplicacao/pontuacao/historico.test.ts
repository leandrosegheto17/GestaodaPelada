import { PESOS_PADRAO, calcularRanking } from '@pelada/dominio';
import type { KyselyPlugin } from 'kysely';
import { describe, expect, it } from 'vitest';
import { carregarHistoricoGrupo } from '../../../src/aplicacao/pontuacao/historico.js';
import { emTransacao } from '../../../src/infraestrutura/db/index.js';
import * as partidas from '../../../src/infraestrutura/db/repositorios/partidas.js';
import * as pesos from '../../../src/infraestrutura/db/repositorios/pesos.js';
import { usarDb } from '../../apoio/db-teste.js';
import { criarJogador } from '../../apoio/fabricas/jogadores.js';
import { usarFabrica } from '../../apoio/fabrica.js';
import { criarBase } from '../../apoio/sql-dados.js';

const fabrica = usarFabrica();
const abrir = usarDb(fabrica);
const AGORA = new Date('2026-10-16T12:00:00Z');

/** Plugin do Kysely que conta cada consulta enviada ao banco pelo executor. */
function contarConsultas() {
  let n = 0;
  const plugin: KyselyPlugin = {
    transformQuery: (args) => {
      n += 1;
      return args.node;
    },
    transformResult: async (args) => args.result,
  };
  return { plugin, total: () => n };
}

describe('carregarHistoricoGrupo', () => {
  it('traz o grupo até a data (inclusive), sem dados de outro grupo, e alimenta o ranking', async () => {
    const db = await abrir();
    const base = await criarBase(db, fabrica);
    const a = await criarJogador(db, base.grupo.id, base.contaId, { apelido: 'Ana', dataEntrada: '2026-01-01' });
    const b = await criarJogador(db, base.grupo.id, base.contaId, { apelido: 'Beto', dataEntrada: '2026-01-01' });
    const alheio = await criarJogador(db, base.outroGrupo.id, base.contaId, { apelido: 'Alheio' });
    await pesos.criarPadrao(db, base.grupo.id, {
      pesos: PESOS_PADRAO,
      vigenteDesde: '2026-01-01',
      registradoPor: base.contaId,
      agora: AGORA,
    });
    await pesos.criar(db, base.grupo.id, {
      pesos: { ...PESOS_PADRAO, presencaComChuva: 2 },
      vigenteDesde: '2026-12-01',
      hoje: '2026-10-16',
      registradoPor: base.contaId,
      agora: AGORA,
    });
    const nova = (grupoId: string, data: string, jogadorId: string) =>
      emTransacao(db, (tx) =>
        partidas.criar(tx, grupoId, {
          data,
          choveu: false,
          presencas: [{ jogadorId, situacao: 'presente' }],
          autor: base.contaId,
          agora: AGORA,
        }),
      );
    await nova(base.grupo.id, '2026-10-01', a);
    await nova(base.grupo.id, '2026-10-08', a);
    await nova(base.grupo.id, '2026-10-15', b);
    await nova(base.outroGrupo.id, '2026-10-01', alheio);

    const contador = contarConsultas();
    const historico = await carregarHistoricoGrupo(db.withPlugin(contador.plugin), base.grupo.id, '2026-10-08');
    expect(contador.total()).toBeGreaterThan(0);
    expect(contador.total()).toBeLessThanOrEqual(4);
    expect(historico.partidas.map((p) => p.data)).toEqual(['2026-10-01', '2026-10-08']);
    expect(historico.presencas).toHaveLength(2);
    expect(historico.jogadores.map((j) => j.apelido).sort()).toEqual(['Ana', 'Beto']);
    expect(historico.configsPesos).toHaveLength(1);

    const ranking = calcularRanking({ hoje: '2026-10-08', mes: '2026-10', ...historico });
    expect(ranking.linhas.map((l) => [l.apelido, l.ptsFinal])).toEqual([
      ['Ana', 2],
      ['Beto', 0],
    ]);
  });
});
