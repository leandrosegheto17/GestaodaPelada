import { describe, expect, it, vi } from 'vitest';
import { emTransacao } from '../../src/infraestrutura/db/index.js';
import { kyselyDe } from '../../src/infraestrutura/db/cliente.js';
import * as vinculos from '../../src/infraestrutura/db/repositorios/vinculos.js';
import { usarDb } from '../apoio/db-teste.js';
import { criarConta } from '../apoio/fabricas/contas.js';
import { criarGrupo, vincularAdmin } from '../apoio/fabricas/grupos.js';
import { usarFabrica } from '../apoio/fabrica.js';

const fabrica = usarFabrica();
const abrir = usarDb(fabrica);

describe('repositório de vínculos (leituras e contagem)', () => {
  it('adminsDoGrupo não devolve hash de senha nem marca de dono', async () => {
    const db = await abrir();
    const conta = await criarConta(db, fabrica);
    const g = await criarGrupo(db, fabrica, { criadoPor: conta.id });
    await vincularAdmin(db, g.id, conta.id);
    const [admin] = await vinculos.adminsDoGrupo(db, g.id);
    expect(Object.keys(admin ?? {}).sort()).toEqual(['acessaFinanceiro', 'contaId', 'email', 'nome']);
  });

  it('contarAdmins conta 2 e depois 1 após remover, também dentro de transação', async () => {
    const db = await abrir();
    const c1 = await criarConta(db, fabrica);
    const c2 = await criarConta(db, fabrica);
    const g = await criarGrupo(db, fabrica, { criadoPor: c1.id });
    await vincularAdmin(db, g.id, c1.id);
    await vincularAdmin(db, g.id, c2.id);
    expect(await vinculos.contarAdmins(db, g.id)).toBe(2);
    const dentro = await emTransacao(db, async (tx) => {
      await vinculos.remover(tx, g.id, c2.id);
      return vinculos.contarAdmins(tx, g.id);
    });
    expect(dentro).toBe(1);
  });

  it('gruposDaConta e adminsDoGrupo fazem uma consulta com 3 linhas', async () => {
    const db = await abrir();
    const contas = [await criarConta(db, fabrica), await criarConta(db, fabrica), await criarConta(db, fabrica)];
    const dono = contas[0]!;
    const g = await criarGrupo(db, fabrica, { criadoPor: dono.id });
    for (const c of contas) await vincularAdmin(db, g.id, c.id);
    for (const n of ['x', 'y']) {
      const outro = await criarGrupo(db, fabrica, { criadoPor: dono.id, nome: `Grupo ${n}` });
      await vincularAdmin(db, outro.id, dono.id);
    }
    const executor = kyselyDe(db).getExecutor();
    const espiao = vi.spyOn(executor, 'executeQuery');
    expect((await vinculos.gruposDaConta(db, dono.id)).length).toBe(3);
    expect(espiao).toHaveBeenCalledTimes(1);
    espiao.mockClear();
    expect((await vinculos.adminsDoGrupo(db, g.id)).length).toBe(3);
    expect(espiao).toHaveBeenCalledTimes(1);
    espiao.mockRestore();
  });
});
