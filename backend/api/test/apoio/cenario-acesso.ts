import { kyselyDe } from '../../src/infraestrutura/db/cliente.js';
import type { Db } from '../../src/infraestrutura/db/index.js';
import { criarConta, type ContaCriada } from './fabricas/contas.js';
import { criarGrupo, vincularAdmin, type GrupoCriado } from './fabricas/grupos.js';
import type { Fabrica } from './fabrica.js';
import { entrarComo } from './sessao.js';

export const EMAIL_DONO = 'leandrosegheto17@gmail.com';

export interface Cenario {
  grupoA: GrupoCriado;
  grupoB: GrupoCriado;
  adminA: ContaCriada & { cookie: string };
  adminASemFinanceiro: ContaCriada & { cookie: string };
  adminB: ContaCriada & { cookie: string };
  dono: ContaCriada & { cookie: string };
}

/**
 * Dois grupos e quatro contas: admin de A com financeiro, admin de A sem financeiro, admin de B
 * (sem financeiro) e o dono, sem vínculo. Tudo é apagado pela fábrica.
 */
export async function montarCenario(db: Db, fabrica: Fabrica): Promise<Cenario> {
  const adminA = await criarConta(db, fabrica, { nome: 'Admin A' });
  const adminASemFinanceiro = await criarConta(db, fabrica, { nome: 'Admin A2' });
  const adminB = await criarConta(db, fabrica, { nome: 'Admin B' });
  const grupoA = await criarGrupo(db, fabrica, { criadoPor: adminA.id, nome: 'Grupo A' });
  const grupoB = await criarGrupo(db, fabrica, { criadoPor: adminB.id, nome: 'Grupo B' });
  await vincularAdmin(db, grupoA.id, adminA.id, { acessaFinanceiro: true });
  await vincularAdmin(db, grupoA.id, adminASemFinanceiro.id, { acessaFinanceiro: false });
  await vincularAdmin(db, grupoB.id, adminB.id, { acessaFinanceiro: false });

  // O papel de dono só existe para o e-mail do RF-01; a conta é marcada direto no banco do teste.
  const dono = await criarConta(db, fabrica, { nome: 'Dono' });
  await kyselyDe(db).updateTable('contas').set({ email: EMAIL_DONO, e_dono: true }).where('id', '=', dono.id).execute();
  const donoComEmail = { ...dono, email: EMAIL_DONO };

  const cookieDe = async (conta: ContaCriada) => (await entrarComo(db, fabrica, conta.id)).cookie;
  return {
    grupoA,
    grupoB,
    adminA: { ...adminA, cookie: await cookieDe(adminA) },
    adminASemFinanceiro: { ...adminASemFinanceiro, cookie: await cookieDe(adminASemFinanceiro) },
    adminB: { ...adminB, cookie: await cookieDe(adminB) },
    dono: { ...donoComEmail, cookie: await cookieDe(donoComEmail) },
  };
}
