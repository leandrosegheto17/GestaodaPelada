import { PESOS_PADRAO } from '@pelada/dominio';
import { painelPesos } from '@pelada/contrato';
import { describe, expect, it, vi } from 'vitest';
import { salvarPesos } from '../../../src/aplicacao/pesos/salvar.js';
import { kyselyDe } from '../../../src/infraestrutura/db/cliente.js';
import * as auditoria from '../../../src/infraestrutura/db/repositorios/auditoria.js';
import * as pesos from '../../../src/infraestrutura/db/repositorios/pesos.js';
import { usarDb } from '../../apoio/db-teste.js';
import { criarConta } from '../../apoio/fabricas/contas.js';
import { criarGrupo } from '../../apoio/fabricas/grupos.js';
import { usarFabrica } from '../../apoio/fabrica.js';
import { AGORA_TESTE, HOJE_TESTE, diaRelativo } from '../../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDb(fabrica);
const NOVOS = {
  presencaSemChuva: 3,
  presencaComChuva: 4,
  lesionadoSemChuva: -10,
  lesionadoComChuva: 10,
  expulsoSemChuva: -5,
  expulsoComChuva: -6,
};

async function cenario() {
  const db = await abrir();
  const conta = await criarConta(db, fabrica);
  const grupo = await criarGrupo(db, fabrica, { criadoPor: conta.id });
  await pesos.criarPadrao(db, grupo.id, {
    pesos: PESOS_PADRAO,
    vigenteDesde: diaRelativo(-30),
    registradoPor: conta.id,
    agora: AGORA_TESTE,
  });
  const entrada = { pesos: NOVOS, contaId: conta.id, hoje: HOJE_TESTE, agora: AGORA_TESTE };
  const acoes = async () =>
    await kyselyDe(db)
      .selectFrom('auditoria')
      .select(['acao', 'autor_conta_id'])
      .where('grupo_id', '=', grupo.id)
      .orderBy('id')
      .execute();
  const configs = async () =>
    kyselyDe(db)
      .selectFrom('config_pesos')
      .select(['vigente_desde', 'expulso'])
      .where('grupo_id', '=', grupo.id)
      .execute();
  return { db, conta, grupo, entrada, acoes, configs };
}

describe('salvarPesos', () => {
  it('vigência = hoje, anterior encerrada no dia anterior, auditoria com autor da conta', async () => {
    const { db, grupo, conta, entrada, acoes } = await cenario();
    const painel = painelPesos.parse(await salvarPesos(db, grupo.id, entrada));
    expect(painel.vigente).toMatchObject({ vigenteDesde: HOJE_TESTE, ...NOVOS });
    expect(painel.historico).toMatchObject([{ vigenteDesde: diaRelativo(-30), vigenteAte: diaRelativo(-1) }]);
    expect(await acoes()).toEqual([{ acao: 'pesos_configurados', autor_conta_id: conta.id }]);
  });

  it('segundo salvamento no mesmo dia substitui e preserva o histórico', async () => {
    const { db, grupo, entrada, acoes, configs } = await cenario();
    await salvarPesos(db, grupo.id, entrada);
    const painel = await salvarPesos(db, grupo.id, {
      ...entrada,
      pesos: { ...NOVOS, expulsoSemChuva: 0, expulsoComChuva: 2 },
    });
    expect(painel.vigente.expulsoSemChuva).toBe(0);
    expect(painel.vigente.expulsoComChuva).toBe(2);
    expect(painel.historico).toHaveLength(1);
    expect(await configs()).toHaveLength(2);
    expect((await acoes()).map((a) => a.acao)).toEqual(['pesos_configurados', 'pesos_substituidos']);
  });

  it('falha na auditoria desfaz a configuração (rollback)', async () => {
    const { db, grupo, entrada, acoes, configs } = await cenario();
    const espiao = vi.spyOn(auditoria, 'registrar').mockRejectedValueOnce(new Error('auditoria fora'));
    await expect(salvarPesos(db, grupo.id, entrada)).rejects.toThrow('auditoria fora');
    espiao.mockRestore();
    expect(await configs()).toHaveLength(1);
    expect(await acoes()).toEqual([]);
  });
});
