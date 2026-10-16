import { describe, expect, it } from 'vitest';
import * as eventos from '../../src/infraestrutura/db/repositorios/eventos.js';
import { usarDb } from '../apoio/db-teste.js';
import { usarFabrica } from '../apoio/fabrica.js';
import { relogioFixo } from '../apoio/relogio.js';
import { criarBase } from '../apoio/sql-dados.js';

const fabrica = usarFabrica();
const abrir = usarDb(fabrica);
const em = (data: string, hora: string) => new Date(relogioFixo(data, hora).agoraIso());
const D1 = '123e4567-e89b-12d3-a456-426614174001';
const D2 = '123e4567-e89b-12d3-a456-426614174002';

describe('repositório de eventos de uso', () => {
  it('os 4 tipos são gravados e agregados por semana (segunda a domingo)', async () => {
    const db = await abrir();
    const base = await criarBase(db, fabrica);
    const g = base.grupo.id;
    // 2026-10-12 é segunda-feira
    await eventos.registrar(db, g, { tipo: 'ranking_aberto', dispositivoId: D1, momento: em('2026-10-14', '10:00') });
    await eventos.registrar(db, g, { tipo: 'ranking_aberto', dispositivoId: D1, momento: em('2026-10-15', '10:00') });
    await eventos.registrar(db, g, { tipo: 'ranking_aberto', dispositivoId: D2, momento: em('2026-10-15', '11:00') });
    await eventos.registrar(db, g, { tipo: 'pdf_exportado', mes: '2026-10', momento: em('2026-10-16', '09:00') });
    await eventos.registrar(db, g, {
      tipo: 'escalacao_confirmada',
      dataPartida: '2026-10-15',
      momento: em('2026-10-15', '12:00'),
    });
    await eventos.registrar(db, g, {
      tipo: 'partida_lancada',
      dataPartida: '2026-10-15',
      momento: em('2026-10-16', '09:00'),
    });
    const semanas = await eventos.porSemana(db, g);
    expect(semanas).toEqual([
      {
        inicio: '2026-10-12',
        fim: '2026-10-18',
        aparelhosRanking: 2,
        pdfsExportados: 1,
        partidasLancadas: 1,
        partidasEm48h: 1,
        escalacoesConfirmadas: 1,
      },
    ]);
  });

  it('fuso: segunda 00:30 em SP abre a semana; domingo 23:30 em SP fica na anterior', async () => {
    const db = await abrir();
    const base = await criarBase(db, fabrica);
    const g = base.grupo.id;
    await eventos.registrar(db, g, { tipo: 'ranking_aberto', dispositivoId: D1, momento: em('2026-10-19', '00:30') });
    await eventos.registrar(db, g, { tipo: 'ranking_aberto', dispositivoId: D2, momento: em('2026-10-18', '23:30') });
    const semanas = await eventos.porSemana(db, g);
    expect(semanas.map((s) => [s.inicio, s.aparelhosRanking])).toEqual([
      ['2026-10-19', 1],
      ['2026-10-12', 1],
    ]);
  });

  it('o mesmo dispositivo 3 vezes na semana conta 1; em duas semanas, 1 em cada', async () => {
    const db = await abrir();
    const base = await criarBase(db, fabrica);
    const g = base.grupo.id;
    for (const dia of ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-21']) {
      await eventos.registrar(db, g, { tipo: 'ranking_aberto', dispositivoId: D1, momento: em(dia, '10:00') });
    }
    expect((await eventos.porSemana(db, g)).map((s) => s.aparelhosRanking)).toEqual([1, 1]);
    expect(await eventos.aparelhosDaSemana(db, g, '2026-10-15')).toBe(1);
    expect(await eventos.aparelhosDaSemana(db, g, '2026-10-30')).toBe(0);
  });

  it('48 horas contam a partir do horário do jogo (20:00 do grupo)', async () => {
    const db = await abrir();
    const base = await criarBase(db, fabrica);
    const g = base.grupo.id;
    // jogo 2026-10-15 às 20:00; +48 h = 2026-10-17 20:00
    await eventos.registrar(db, g, {
      tipo: 'partida_lancada',
      dataPartida: '2026-10-15',
      momento: em('2026-10-17', '19:00'),
    });
    await eventos.registrar(db, g, {
      tipo: 'partida_lancada',
      dataPartida: '2026-10-15',
      momento: em('2026-10-17', '21:00'),
    });
    const [semana] = await eventos.porSemana(db, g);
    expect(semana?.partidasLancadas).toBe(2);
    expect(semana?.partidasEm48h).toBe(1);
  });

  it('grupo sem eventos devolve lista vazia e não vê eventos de outro grupo', async () => {
    const db = await abrir();
    const base = await criarBase(db, fabrica);
    await eventos.registrar(db, base.outroGrupo.id, {
      tipo: 'ranking_aberto',
      dispositivoId: D1,
      momento: em('2026-10-14', '10:00'),
    });
    expect(await eventos.porSemana(db, base.grupo.id)).toEqual([]);
    expect(await eventos.aparelhosDaSemana(db, base.grupo.id, '2026-10-14')).toBe(0);
  });
});
