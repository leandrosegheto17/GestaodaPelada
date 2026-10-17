import { partidaDetalhe } from '@pelada/contrato';
import { describe, expect, it } from 'vitest';
import { kyselyDe } from '../../../../src/infraestrutura/db/cliente.js';
import { montarCenario } from '../../../apoio/cenario-acesso.js';
import { clienteTeste } from '../../../apoio/cliente.js';
import { usarDbDoWorker } from '../../../apoio/db-worker.js';
import { criarJogador } from '../../../apoio/fabricas/jogadores.js';
import { criarPartida } from '../../../apoio/fabricas/partidas.js';
import { usarFabrica } from '../../../apoio/fabrica.js';
import { AGORA_TESTE, HOJE_TESTE, diaRelativo, relogioFixo } from '../../../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);

async function base() {
  const db = await abrir();
  const cen = await montarCenario(db, fabrica);
  const g = cen.grupoA.id;
  const jogador = await criarJogador(db, g, cen.adminA.id, { apelido: 'Ana', dataEntrada: diaRelativo(-60) });
  const data = diaRelativo(-3);
  await criarPartida(db, g, data, cen.adminA.id, { presencas: [{ jogadorId: jogador, situacao: 'presente' }] });
  const url = `/api/grupos/${g}/partidas/${data}`;
  const corpo = { data, choveu: true, marcacoes: [{ jogadorId: jogador, situacao: 'lesionado' }] };
  const admin = () => clienteTeste({ relogio: relogioFixo(HOJE_TESTE), cookie: cen.adminA.cookie });
  return { db, cen, g, jogador, data, url, corpo, admin };
}

describe('PUT /api/grupos/:g/partidas/:data (workerd)', () => {
  it('200 no schema do detalhe, sem cache, com a alteração gravada pela sessão e pelo relógio', async () => {
    const { db, g, url, corpo, admin } = await base();
    const r = await admin().put(url, corpo);
    expect(r.status).toBe(200);
    expect(r.headers.get('Cache-Control')).toContain('no-store');
    expect(partidaDetalhe.parse(r.corpo)).toMatchObject({ choveu: true, alteradaPor: 'Admin A' });
    const linha = await kyselyDe(db).selectFrom('partidas').select('alterada_em').where('grupo_id', '=', g).executeTakeFirst();
    expect(linha?.alterada_em.getTime()).toBe(AGORA_TESTE.getTime());
  });

  it('422: corpo com campo extra, sem choveu, data diferente do caminho e data futura', async () => {
    const { url, corpo, admin } = await base();
    const { choveu: _choveu, ...semChoveu } = corpo;
    const casos = [
      { ...corpo, extra: 1 },
      semChoveu,
      { ...corpo, data: diaRelativo(-4) },
      { ...corpo, data: diaRelativo(1) },
    ];
    for (const c of casos) expect((await admin().put(url, c)).status).toBe(422);
  });

  it('404: data malformada ou impossível, e partida de outro grupo', async () => {
    const { cen, g, data, corpo, admin } = await base();
    for (const d of ['2026-13-01', 'abc', '2026-02-30']) {
      expect((await admin().put(`/api/grupos/${g}/partidas/${d}`, corpo)).status).toBe(404);
    }
    const outro = clienteTeste({ relogio: relogioFixo(HOJE_TESTE), cookie: cen.adminB.cookie });
    expect((await outro.put(`/api/grupos/${g}/partidas/${data}`, corpo)).status).toBe(404);
  });

  it('401 sem sessão e 403 sem X-Pelada', async () => {
    const { cen, url, corpo } = await base();
    expect((await clienteTeste({ relogio: relogioFixo(HOJE_TESTE) }).put(url, corpo)).status).toBe(401);
    const semCsrf = clienteTeste({ relogio: relogioFixo(HOJE_TESTE), cookie: cen.adminA.cookie, semCsrf: true });
    expect((await semCsrf.put(url, corpo)).status).toBe(403);
  });
});
