import { describe, expect, it } from 'vitest';
import { kyselyDe } from '../../../../src/infraestrutura/db/cliente.js';
import { montarCenario } from '../../../apoio/cenario-acesso.js';
import { clienteTeste } from '../../../apoio/cliente.js';
import { usarDbDoWorker } from '../../../apoio/db-worker.js';
import { criarJogador } from '../../../apoio/fabricas/jogadores.js';
import { usarFabrica } from '../../../apoio/fabrica.js';
import { AGORA_TESTE, HOJE_TESTE, diaRelativo, relogioFixo } from '../../../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);
const cliente = (cookie?: string, semCsrf = false) =>
  clienteTeste({ relogio: relogioFixo(HOJE_TESTE), ...(cookie ? { cookie } : {}), semCsrf });

async function base() {
  const db = await abrir();
  const cen = await montarCenario(db, fabrica);
  const g = cen.grupoA.id;
  const entrada = diaRelativo(-60);
  const a = await criarJogador(db, g, cen.adminA.id, { apelido: 'Ana', dataEntrada: entrada });
  const b = await criarJogador(db, cen.grupoB.id, cen.adminB.id, { apelido: 'Bia', dataEntrada: entrada });
  const dia = diaRelativo(-3);
  const outroDia = diaRelativo(-4);
  const lancar = (cookie: string, grupo: string, jogador: string, data: string) =>
    cliente(cookie).post(`/api/grupos/${grupo}/partidas`, {
      data,
      choveu: false,
      marcacoes: [{ jogadorId: jogador, situacao: 'presente' }],
    });
  await lancar(cen.adminA.cookie, g, a, dia);
  await lancar(cen.adminA.cookie, g, a, outroDia);
  await lancar(cen.adminB.cookie, cen.grupoB.id, b, dia);
  return { db, cen, g, dia, outroDia };
}

describe('DELETE /api/grupos/:g/partidas/:data (workerd)', () => {
  it('204 sem corpo; só a partida da data some, nada de outro dia nem de outro grupo; 1 auditoria do autor', async () => {
    const { db, cen, g, dia, outroDia } = await base();
    const r = await cliente(cen.adminA.cookie).delete(`/api/grupos/${g}/partidas/${dia}`);
    expect(r.status).toBe(204);
    expect(r.texto).toBe('');
    expect(r.headers.get('Cache-Control')).toContain('no-store');
    const banco = kyselyDe(db);
    const restantes = await banco.selectFrom('partidas').select(['grupo_id', 'data']).execute();
    expect(restantes.map((p) => `${p.grupo_id}|${String(p.data).slice(0, 10)}`).sort()).toEqual(
      [`${g}|${outroDia}`, `${cen.grupoB.id}|${dia}`].sort(),
    );
    expect(await banco.selectFrom('presencas').select('partida_id').execute()).toHaveLength(2);
    const aud = await banco
      .selectFrom('auditoria')
      .select(['autor_conta_id', 'momento'])
      .where('grupo_id', '=', g)
      .where('acao', '=', 'partida_excluida')
      .execute();
    expect(aud).toHaveLength(1);
    expect(aud[0]!.autor_conta_id).toBe(cen.adminA.id);
    expect(new Date(aud[0]!.momento).getTime()).toBe(AGORA_TESTE.getTime());
  });

  it('depois de excluir: GET da data 404 e "nova" nesse dia deixa de dar 409', async () => {
    const { cen, g, dia } = await base();
    expect((await cliente(cen.adminA.cookie).get(`/api/grupos/${g}/partidas/nova?data=${dia}`)).status).toBe(409);
    await cliente(cen.adminA.cookie).delete(`/api/grupos/${g}/partidas/${dia}`);
    expect((await cliente(cen.adminA.cookie).get(`/api/grupos/${g}/partidas/${dia}`)).status).toBe(404);
    expect((await cliente(cen.adminA.cookie).get(`/api/grupos/${g}/partidas/nova?data=${dia}`)).status).toBe(200);
  });

  it('404: segunda exclusão, data sem partida, malformada e partida de outro grupo (nada apagado)', async () => {
    const { db, cen, g, dia, outroDia } = await base();
    const url = (d: string) => `/api/grupos/${g}/partidas/${d}`;
    expect((await cliente(cen.adminA.cookie).delete(url(dia))).status).toBe(204);
    expect((await cliente(cen.adminA.cookie).delete(url(dia))).status).toBe(404);
    expect((await cliente(cen.adminA.cookie).delete(url(diaRelativo(-30)))).status).toBe(404);
    expect((await cliente(cen.adminA.cookie).delete(url('2026-02-30'))).status).toBe(404);
    expect((await cliente(cen.adminA.cookie).delete(url('x'))).status).toBe(404);
    const antes = await kyselyDe(db).selectFrom('partidas').select('id').execute();
    expect((await cliente(cen.adminB.cookie).delete(url(outroDia))).status).toBe(404);
    expect(await kyselyDe(db).selectFrom('partidas').select('id').execute()).toHaveLength(antes.length);
  });

  it('401 sem sessão e 403 sem X-Pelada', async () => {
    const { cen, g, dia } = await base();
    expect((await cliente().delete(`/api/grupos/${g}/partidas/${dia}`)).status).toBe(401);
    expect((await cliente(cen.adminA.cookie, true).delete(`/api/grupos/${g}/partidas/${dia}`)).status).toBe(403);
  });
});
