import { describe, expect, it } from 'vitest';
import * as tentativas from '../../src/infraestrutura/db/repositorios/tentativas.js';
import { usarDb } from '../apoio/db-teste.js';
import { usarFabrica } from '../apoio/fabrica.js';
import { relogioFixo } from '../apoio/relogio.js';
import { executarSql } from '../apoio/sql.js';

const fabrica = usarFabrica();
const abrir = usarDb(fabrica);
const MINUTO = 60 * 1000;
const base = new Date(relogioFixo('2026-10-16').agoraIso());
const antes = (ms: number) => new Date(base.getTime() - ms);
const EMAIL = 'tentativas@teste.invalid';
const OUTRO = 'outro-tentativas@teste.invalid';

async function preparar() {
  fabrica.registrar(async () => {
    await executarSql('DELETE FROM tentativas_login WHERE email IN ($1, $2)', [EMAIL, OUTRO]);
  });
  return abrir();
}

describe('repositório de tentativas de login', () => {
  it('conta 5 falhas em 14 minutos e ignora a de 15 min e 1 s', async () => {
    const db = await preparar();
    for (let i = 1; i <= 5; i++) {
      await tentativas.registrar(db, {
        email: EMAIL,
        sucesso: false,
        agora: antes(i * 2 * MINUTO),
      });
    }
    expect(await tentativas.contarFalhasRecentes(db, EMAIL, base)).toBe(5);
    await tentativas.registrar(db, {
      email: EMAIL,
      sucesso: false,
      agora: antes(15 * MINUTO + 1000),
    });
    expect(await tentativas.contarFalhasRecentes(db, EMAIL, base)).toBe(5);
  });

  it('sucessos e outros e-mails não contam', async () => {
    const db = await preparar();
    await tentativas.registrar(db, { email: EMAIL, sucesso: true, agora: antes(MINUTO) });
    await tentativas.registrar(db, { email: OUTRO, sucesso: false, agora: antes(MINUTO) });
    expect(await tentativas.contarFalhasRecentes(db, EMAIL, base)).toBe(0);
  });

  it('podar remove só as com mais de um dia', async () => {
    const db = await preparar();
    await tentativas.registrar(db, {
      email: EMAIL,
      sucesso: false,
      agora: antes(25 * 60 * MINUTO),
    });
    await tentativas.registrar(db, {
      email: EMAIL,
      sucesso: false,
      agora: antes(23 * 60 * MINUTO),
    });
    expect(await tentativas.podar(db, base)).toBe(1);
    const restantes = await executarSql('SELECT 1 FROM tentativas_login WHERE email = $1', [EMAIL]);
    expect(restantes).toHaveLength(1);
  });

  it('um sucesso zera a contagem e o bloqueio informa quando libera', async () => {
    const db = await preparar();
    for (let i = 5; i >= 1; i--) {
      await tentativas.registrar(db, { email: EMAIL, sucesso: false, agora: antes(i * MINUTO) });
    }
    const bloqueio = await tentativas.consultarBloqueio(db, EMAIL, base);
    expect(bloqueio.falhas).toBe(5);
    expect(bloqueio.liberaEm).toEqual(new Date(antes(MINUTO).getTime() + 15 * MINUTO));
    await tentativas.registrar(db, { email: EMAIL, sucesso: true, agora: antes(30_000) });
    expect(await tentativas.contarFalhasRecentes(db, EMAIL, base)).toBe(0);
    expect((await tentativas.consultarBloqueio(db, EMAIL, base)).liberaEm).toBeNull();
  });
});
