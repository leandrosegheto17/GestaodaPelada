import { describe, expect, it } from 'vitest';
import { kyselyDe, type Db } from '../../src/infraestrutura/db/cliente.js';
import * as eventos from '../../src/infraestrutura/db/repositorios/eventos.js';
import { contarConsultas } from '../apoio/contar-consultas.js';
import { usarDb } from '../apoio/db-teste.js';
import { criarEvento } from '../apoio/fabricas/eventos.js';
import { usarFabrica } from '../apoio/fabrica.js';
import { relogioFixo } from '../apoio/relogio.js';
import { criarBase } from '../apoio/sql-dados.js';

const fabrica = usarFabrica();
const abrir = usarDb(fabrica);
const em = (data: string, hora: string) => new Date(relogioFixo(data, hora).agoraIso());
const D1 = '123e4567-e89b-12d3-a456-426614174001';
const D2 = '123e4567-e89b-12d3-a456-426614174002';
const D3 = '123e4567-e89b-12d3-a456-426614174003';

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

  it('eventos de B não entram em aparelhosDaSemana(A) nem em porSemana(A), com A também populado', async () => {
    const db = await abrir();
    const base = await criarBase(db, fabrica);
    const a = base.grupo.id;
    const b = base.outroGrupo.id;
    await criarEvento(db, fabrica, a, {
      tipo: 'ranking_aberto',
      dispositivoId: D1,
      momento: em('2026-10-14', '10:00'),
    });
    await criarEvento(db, fabrica, b, {
      tipo: 'ranking_aberto',
      dispositivoId: D2,
      momento: em('2026-10-14', '10:00'),
    });
    await criarEvento(db, fabrica, b, {
      tipo: 'ranking_aberto',
      dispositivoId: D3,
      momento: em('2026-10-15', '10:00'),
    });
    await criarEvento(db, fabrica, b, { tipo: 'pdf_exportado', mes: '2026-10', momento: em('2026-10-15', '11:00') });
    expect(await eventos.aparelhosDaSemana(db, a, '2026-10-14')).toBe(1);
    expect(await eventos.aparelhosDaSemana(db, b, '2026-10-14')).toBe(2);
    const [semanaA] = await eventos.porSemana(db, a);
    expect(semanaA?.aparelhosRanking).toBe(1);
    expect(semanaA?.pdfsExportados).toBe(0);
  });

  it('porSemana com 4 semanas usa 1 consulta', async () => {
    const db = await abrir();
    const base = await criarBase(db, fabrica);
    const g = base.grupo.id;
    for (const dia of ['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26']) {
      await criarEvento(db, fabrica, g, { tipo: 'ranking_aberto', dispositivoId: D1, momento: em(dia, '10:00') });
    }
    let semanas: Awaited<ReturnType<typeof eventos.porSemana>> = [];
    const consultas = await contarConsultas(async () => {
      semanas = await eventos.porSemana(db, g);
    });
    expect(semanas).toHaveLength(4);
    expect(consultas).toBe(1);
  });

  describe('colunas gravadas por tipo', () => {
    const ler = (db: Db, grupoId: string) =>
      kyselyDe(db)
        .selectFrom('eventos_uso')
        .select(['tipo', 'dispositivo_id', 'mes_exportado', 'data_partida'])
        .where('grupo_id', '=', grupoId)
        .execute();

    it('ranking_aberto grava só dispositivo_id', async () => {
      const db = await abrir();
      const base = await criarBase(db, fabrica);
      await criarEvento(db, fabrica, base.grupo.id, {
        tipo: 'ranking_aberto',
        dispositivoId: D1,
        momento: em('2026-10-14', '10:00'),
      });
      expect(await ler(db, base.grupo.id)).toEqual([
        { tipo: 'ranking_aberto', dispositivo_id: D1, mes_exportado: null, data_partida: null },
      ]);
    });

    it('pdf_exportado grava só mes_exportado', async () => {
      const db = await abrir();
      const base = await criarBase(db, fabrica);
      await criarEvento(db, fabrica, base.grupo.id, {
        tipo: 'pdf_exportado',
        mes: '2026-10',
        momento: em('2026-10-14', '10:00'),
      });
      expect(await ler(db, base.grupo.id)).toEqual([
        { tipo: 'pdf_exportado', dispositivo_id: null, mes_exportado: '2026-10', data_partida: null },
      ]);
    });

    it.each(['escalacao_confirmada', 'partida_lancada'] as const)('%s grava só data_partida', async (tipo) => {
      const db = await abrir();
      const base = await criarBase(db, fabrica);
      await criarEvento(db, fabrica, base.grupo.id, {
        tipo,
        dataPartida: '2026-10-15',
        momento: em('2026-10-15', '12:00'),
      });
      expect(await ler(db, base.grupo.id)).toEqual([
        { tipo, dispositivo_id: null, mes_exportado: null, data_partida: '2026-10-15' },
      ]);
    });
  });

  it('o tipo fechado recusa dado pessoal e exige dispositivoId em ranking_aberto', () => {
    // Só checagem de tipo (tsc); a função nunca roda.
    const M = em('2026-10-14', '10:00');
    const _nunca = async (db: Db): Promise<void> => {
      // @ts-expect-error campo livre `ip` não existe no evento
      await eventos.registrar(db, 'g', { tipo: 'pdf_exportado', mes: '2026-10', momento: M, ip: '1.2.3.4' });
      // @ts-expect-error campo livre `nome` não existe no evento
      await eventos.registrar(db, 'g', { tipo: 'partida_lancada', dataPartida: '2026-10-15', momento: M, nome: 'Ana' });
      // @ts-expect-error ranking_aberto exige dispositivoId
      await eventos.registrar(db, 'g', { tipo: 'ranking_aberto', momento: M });
      // @ts-expect-error dispositivoId só existe em ranking_aberto
      await eventos.registrar(db, 'g', { tipo: 'pdf_exportado', mes: '2026-10', momento: M, dispositivoId: D1 });
    };
    expect(typeof _nunca).toBe('function');
  });
});
