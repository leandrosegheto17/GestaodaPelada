import { describe, expect, it } from 'vitest';
import { criarApp } from '../../src/entrada/app.js';
import { montarCenario } from '../apoio/cenario-acesso.js';
import { usarDbDoWorker } from '../apoio/db-worker.js';
import { usarFabrica } from '../apoio/fabrica.js';
import { CASOS } from './casos.js';
import { listarRotas } from './rotas.js';
import { verificarCaso } from './verificar.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);

describe('a suíte de isolamento morde', () => {
  it('rota de grupo sem caso é apontada pela cobertura', () => {
    const app = criarApp();
    app.get('/api/grupos/:grupoId/sem-caso', (c) => c.json({}));
    const semCaso = listarRotas(app).filter((r) => !(r in CASOS));
    expect(semCaso).toContain('GET /api/grupos/:grupoId/sem-caso');
  });

  it('rota ALL (middleware) não entra na lista, mas rota de negócio entra', () => {
    const base = listarRotas(criarApp());
    const app = criarApp();
    app.use('/api/qualquer/*', async (_c, proximo) => proximo());
    app.post('/api/grupos/:grupoId/ok', (c) => c.json({}));
    const novas = listarRotas(app).filter((r) => !base.includes(r));
    expect(novas).toEqual(['POST /api/grupos/:grupoId/ok']);
  });

  it('rota sob o prefixo protegido passa no helper', async () => {
    const cenario = await montarCenario(await abrir(), fabrica);
    await expect(
      verificarCaso('GET /api/grupos/:grupoId/eco', { tipo: 'grupo' }, cenario, {
        montar: (app) => void app.get('/api/grupos/:grupoId/eco', (c) => c.json({ ok: true })),
      }),
    ).resolves.toBeUndefined();
  });

  it('rota de negócio registrada com app.all é apontada como sem caso', () => {
    const app = criarApp();
    app.all('/api/grupos/:grupoId/x', (c) => c.json({}));
    const semCaso = listarRotas(app).filter((r) => !(r in CASOS));
    expect(semCaso).toContain('ALL /api/grupos/:grupoId/x');
  });

  it('middleware registrado por use (com proximo) não é apontado, mesmo sob /api/grupos', () => {
    const app = criarApp();
    app.use('/api/grupos/:grupoId/*', async (_c, proximo) => proximo());
    const semCaso = listarRotas(app).filter((r) => !(r in CASOS));
    expect(semCaso).toEqual([]);
  });

  it('rota de grupo registrada fora do prefixo protegido faz o helper falhar', async () => {
    const cenario = await montarCenario(await abrir(), fabrica);
    await expect(
      verificarCaso('GET /api/vazamento/:grupoId', { tipo: 'grupo' }, cenario, {
        montar: (app) => void app.get('/api/vazamento/:grupoId', (c) => c.json({ vazou: true })),
      }),
    ).rejects.toThrow();
  });

  it('justificativa vazia falha', async () => {
    const cenario = await montarCenario(await abrir(), fabrica);
    await expect(
      verificarCaso('GET /api/x', { tipo: 'nao_se_aplica', justificativa: '  ' }, cenario),
    ).rejects.toThrow();
  });
});
