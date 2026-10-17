import { listaAdmins } from '@pelada/contrato';
import { describe, expect, it, vi } from 'vitest';
import type { ExecutorDb } from '../../../src/infraestrutura/db/index.js';

const adminsDoGrupo = vi.hoisted(() => vi.fn());
vi.mock('../../../src/infraestrutura/db/repositorios/vinculos.js', () => ({ adminsDoGrupo }));

const { montarListaAdmins } = await import('../../../src/aplicacao/grupos/admins/lista.js');

const ex = {} as ExecutorDb;
const ID_A = '11111111-1111-4111-8111-111111111111';
const ID_B = '22222222-2222-4222-8222-222222222222';

describe('montarListaAdmins', () => {
  it('uma só consulta; marca "voce" na linha de quem pede e repassa o financeiro dele', async () => {
    adminsDoGrupo.mockResolvedValue([
      { contaId: ID_A, nome: 'Ana', email: 'ana@exemplo.com', acessaFinanceiro: true },
      { contaId: ID_B, nome: 'Bia', email: 'bia@exemplo.com', acessaFinanceiro: false },
    ]);
    const lista = await montarListaAdmins(ex, 'g1', { contaId: ID_B, acessaFinanceiro: false });
    expect(adminsDoGrupo).toHaveBeenCalledTimes(1);
    expect(adminsDoGrupo).toHaveBeenCalledWith(ex, 'g1');
    expect(listaAdmins.parse(lista)).toEqual(lista);
    expect(lista.admins.map((a) => a.voce)).toEqual([false, true]);
    expect(lista.podeGerirFinanceiro).toBe(false);
    expect(JSON.stringify(lista)).not.toMatch(/senha|hash/i);
  });
});
