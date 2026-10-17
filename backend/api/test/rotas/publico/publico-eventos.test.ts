import { LIMITES } from '@pelada/contrato';
import { env } from 'cloudflare:test';
import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { sql } from 'kysely';
import { describe, expect, it } from 'vitest';
import { kyselyDe } from '../../../src/infraestrutura/db/cliente.js';
import { montarCenario } from '../../apoio/cenario-acesso.js';
import { clienteTeste } from '../../apoio/cliente.js';
import { usarDbDoWorker } from '../../apoio/db-worker.js';
import { usarFabrica } from '../../apoio/fabrica.js';
import { relogioFixo } from '../../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);
const relogio = relogioFixo('2026-10-22');
const anonimo = (semCsrf = false) => clienteTeste({ relogio, semCsrf });
const DISPOSITIVO = '123e4567-e89b-12d3-a456-426614174000';

async function linhas(db: Awaited<ReturnType<typeof abrir>>, grupoId: string) {
  return kyselyDe(db).selectFrom('eventos_uso').selectAll().where('grupo_id', '=', grupoId).execute();
}

/** Corpo com exatamente `bytes` bytes, JSON válido de `ranking_aberto` com campo de preenchimento. */
function corpoDeTamanho(bytes: number, extra: boolean): string {
  const base = { tipo: 'ranking_aberto', dispositivoId: DISPOSITIVO };
  const vazio = JSON.stringify(extra ? { ...base, p: '' } : base);
  return extra ? JSON.stringify({ ...base, p: 'x'.repeat(bytes - vazio.length) }) : vazio;
}

async function enviarBruto(url: string, init: RequestInit & { duplex?: string }) {
  const app = anonimo().app;
  const ctx = createExecutionContext();
  const h = new Headers(init.headers);
  h.set('X-Pelada', '1');
  const r = await app.fetch(new Request(`http://app.invalid${url}`, { ...init, headers: h }), env, ctx);
  await waitOnExecutionContext(ctx);
  return { status: r.status, texto: await r.text(), headers: r.headers };
}

describe('POST /api/publico/:slug/eventos (workerd)', () => {
  it('ranking_aberto: 204 sem corpo, momento = relógio, sem Cache', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const r = await anonimo().post(`/api/publico/${cen.grupoA.slug}/eventos`, {
      tipo: 'ranking_aberto',
      dispositivoId: DISPOSITIVO,
    });
    expect(r.status).toBe(204);
    expect(r.texto).toBe('');
    expect(r.headers.get('Cache-Control')).toBe('no-store');
    const l = await linhas(db, cen.grupoA.id);
    expect(l).toHaveLength(1);
    expect(l[0]).toMatchObject({ tipo: 'ranking_aberto', dispositivo_id: DISPOSITIVO, mes_exportado: null });
    expect(new Date(l[0]!.momento).toISOString()).toBe(relogio.agoraIso());
  });

  it('pdf_exportado: 204, mês gravado e dispositivo nulo', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const r = await anonimo().post(`/api/publico/${cen.grupoA.slug}/eventos`, {
      tipo: 'pdf_exportado',
      mes: '2026-10',
    });
    expect(r.status).toBe(204);
    const l = await linhas(db, cen.grupoA.id);
    expect(l[0]).toMatchObject({ tipo: 'pdf_exportado', mes_exportado: '2026-10', dispositivo_id: null });
  });

  it('422 para tipos fora do contrato, campos extras e formatos ruins; nada gravado', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const url = `/api/publico/${cen.grupoA.slug}/eventos`;
    const ruins: unknown[] = [
      { tipo: 'escalacao_confirmada', data: '2026-10-08' },
      { tipo: 'partida_lancada', data: '2026-10-08' },
      { tipo: 'pagina_vista' },
      { tipo: 'ranking_aberto', dispositivoId: DISPOSITIVO, ip: '1.2.3.4' },
      { tipo: 'ranking_aberto', dispositivoId: DISPOSITIVO, userAgent: 'x' },
      { tipo: 'pdf_exportado', mes: '2026-10', nome: 'Ana' },
      { tipo: 'ranking_aberto', dispositivoId: 'x' },
      { tipo: 'ranking_aberto' },
      { tipo: 'pdf_exportado', mes: '2026-13' },
      [],
      null,
    ];
    for (const ruim of ruins) {
      const r = await enviarBruto(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruim),
      });
      expect(r.status, JSON.stringify(ruim)).toBe(422);
    }
    const texto = await enviarBruto(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'isto nao e json',
    });
    expect(texto.status).toBe(422);
    expect(await linhas(db, cen.grupoA.id)).toHaveLength(0);
  });

  it('413 acima de 1 KB (com e sem Content-Length); 1024 bytes passam; nada gravado nos 413', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const url = `/api/publico/${cen.grupoA.slug}/eventos`;
    const json = { 'Content-Type': 'application/json' };
    const grande = corpoDeTamanho(LIMITES.corpoPublicoBytes + 1, true);
    expect(grande.length).toBe(LIMITES.corpoPublicoBytes + 1);
    const a = await enviarBruto(url, { method: 'POST', headers: json, body: grande });
    expect(a.status).toBe(413);

    const fluxo = new ReadableStream({
      start(ctl) {
        ctl.enqueue(new TextEncoder().encode(grande));
        ctl.close();
      },
    });
    const b = await enviarBruto(url, { method: 'POST', headers: json, body: fluxo, duplex: 'half' });
    expect(b.status).toBe(413);
    expect(await linhas(db, cen.grupoA.id)).toHaveLength(0);

    // Borda: 1024 bytes exatos não dão 413 (o campo extra é recusado como 422 pelo contrato estrito).
    const borda = await enviarBruto(url, {
      method: 'POST',
      headers: json,
      body: corpoDeTamanho(LIMITES.corpoPublicoBytes, true),
    });
    expect(borda.status).toBe(422);
  });

  it('404 igual para slug inexistente, malformado e arquivado; nada gravado', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const corpo = { tipo: 'ranking_aberto', dispositivoId: DISPOSITIVO };
    const inexistente = await anonimo().post('/api/publico/nao-existe/eventos', corpo);
    const malformado = await anonimo().post('/api/publico/AB_C!/eventos', corpo);
    await kyselyDe(db)
      .updateTable('grupos')
      .set({ arquivado_em: new Date(relogio.agoraIso()) })
      .where('id', '=', cen.grupoA.id)
      .execute();
    const arquivado = await anonimo().post(`/api/publico/${cen.grupoA.slug}/eventos`, corpo);
    expect(inexistente.status).toBe(404);
    expect(malformado.texto).toBe(inexistente.texto);
    expect(arquivado.status).toBe(404);
    expect(arquivado.texto).toBe(inexistente.texto);
    expect(await linhas(db, cen.grupoA.id)).toHaveLength(0);
  });

  it('sem X-Pelada: 403 e nada gravado', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const r = await anonimo(true).post(`/api/publico/${cen.grupoA.slug}/eventos`, {
      tipo: 'ranking_aberto',
      dispositivoId: DISPOSITIVO,
    });
    expect(r.status).toBe(403);
    expect(await linhas(db, cen.grupoA.id)).toHaveLength(0);
  });

  it('IP e user-agent da requisição não aparecem em nenhuma coluna de eventos_uso', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const r = await enviarBruto(`/api/publico/${cen.grupoA.slug}/eventos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CF-Connecting-IP': '203.0.113.77',
        'User-Agent': 'AgenteSecreto/9',
      },
      body: JSON.stringify({ tipo: 'ranking_aberto', dispositivoId: DISPOSITIVO }),
    });
    expect(r.status).toBe(204);
    const { rows: colunas } = await sql<{
      column_name: string;
    }>`SELECT column_name FROM information_schema.columns WHERE table_name = 'eventos_uso'`.execute(kyselyDe(db));
    expect(colunas.map((x) => x.column_name).sort()).toEqual([
      'data_partida',
      'dispositivo_id',
      'grupo_id',
      'id',
      'mes_exportado',
      'momento',
      'tipo',
    ]);
    const tudo = JSON.stringify(await linhas(db, cen.grupoA.id));
    expect(tudo).not.toContain('203.0.113.77');
    expect(tudo).not.toContain('AgenteSecreto');
  });
});
