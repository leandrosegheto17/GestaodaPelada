import { PESOS_PADRAO } from '@pelada/dominio';
import { describe, expect, it } from 'vitest';
import { avaliarPedidoDePeriodos } from '../../../src/aplicacao/elenco/avaliacao-periodos.js';
import * as jogadores from '../../../src/infraestrutura/db/repositorios/jogadores.js';
import * as pesos from '../../../src/infraestrutura/db/repositorios/pesos.js';
import { contarConsultas } from '../../apoio/contar-consultas.js';
import { usarDb } from '../../apoio/db-teste.js';
import { criarJogador } from '../../apoio/fabricas/jogadores.js';
import { criarPartida } from '../../apoio/fabricas/partidas.js';
import { usarFabrica } from '../../apoio/fabrica.js';
import { AGORA_TESTE, HOJE_TESTE, diaRelativo as d } from '../../apoio/relogio.js';
import { criarBase } from '../../apoio/sql-dados.js';

const fabrica = usarFabrica();
const abrir = usarDb(fabrica);

describe('avaliarPedidoDePeriodos com histórico importado', () => {
  it('o número de consultas não cresce com as partidas e fica em até 4', async () => {
    const db = await abrir();
    const base = await criarBase(db, fabrica);
    const g = base.grupo.id;
    await pesos.criarPadrao(db, g, {
      pesos: PESOS_PADRAO,
      vigenteDesde: d(-400),
      registradoPor: base.contaId,
      agora: AGORA_TESTE,
    });
    const id = await criarJogador(db, g, base.contaId, { dataEntrada: d(-300) });
    await jogadores.inativar(db, g, id, d(-200));
    await jogadores.reativar(db, g, id, d(-100));
    const [, retorno] = (await jogadores.buscar(db, g, id))!.periodos;
    for (let i = 0; i < 30; i++) {
      await criarPartida(db, g, d(-290 + i * 3), base.contaId, {
        presencas: [{ jogadorId: id, situacao: 'presente' }],
      });
    }
    const pedido = { operacao: 'corrigir' as const, periodoId: retorno!.id, retorno: d(-150) };
    const total = await contarConsultas(() => avaliarPedidoDePeriodos(db, g, id, pedido, { hoje: HOJE_TESTE }));
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThanOrEqual(4);
  });
});
