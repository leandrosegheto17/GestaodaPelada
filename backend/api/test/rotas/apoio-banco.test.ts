import { describe, expect, it } from 'vitest';
import { consultarBloqueio } from '../../src/infraestrutura/db/repositorios/tentativas.js';
import { usarDbDoWorker } from '../apoio/db-worker.js';
import { usarFabrica } from '../apoio/fabrica.js';
import { relogioFixo } from '../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);

describe('banco de teste visto do workerd', () => {
  it('consulta pelo binding do Hyperdrive dentro do Worker', async () => {
    const db = await abrir();
    const agora = new Date(relogioFixo('2026-10-16').agoraIso());
    const bloqueio = await consultarBloqueio(db, 'sem-registro@teste.invalid', agora);
    expect(bloqueio).toEqual({ falhas: 0, liberaEm: null });
  });
});
