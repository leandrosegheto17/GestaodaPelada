import { describe, expect, it } from 'vitest';
import { usarDb } from '../apoio/db-teste.js';
import { usarFabrica } from '../apoio/fabrica.js';
import { criarRelogio } from '../../src/infraestrutura/relogio/index.js';
import { relogioFixo } from '../apoio/relogio.js';
import { criarBase, inserirJogador } from '../apoio/sql-dados.js';
import { codigoDoErro, executarSql } from '../apoio/sql.js';

const fabrica = usarFabrica();
const abrir = usarDb(fabrica);
const relogio = relogioFixo(criarRelogio().hoje());
const AGORA = relogio.agoraIso();
const dia = (n: number): string => {
  const d = new Date(AGORA);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const VIGENCIA = dia(0);

async function inserirPartida(conta: string, grupoId: string, data: string): Promise<string> {
  const linhas = await executarSql<{ id: string }>(
    `INSERT INTO partidas (grupo_id, data, criada_por, criada_em, alterada_por, alterada_em)
     VALUES ($1, $2, $3, $4, $3, $4) RETURNING id`,
    [grupoId, data, conta, AGORA],
  );
  const id = linhas[0]?.id as string;
  fabrica.registrar(async () => {
    await executarSql('DELETE FROM partidas WHERE id = $1', [id]);
  });
  return id;
}

describe('migração de pesos, partidas e presenças', () => {
  it('config de pesos: faixa de -10 a 10 e uma por grupo e vigência', async () => {
    const base = await criarBase(await abrir(), fabrica);
    fabrica.registrar(async () => {
      await executarSql('DELETE FROM config_pesos WHERE grupo_id = ANY($1)', [[base.grupo.id, base.outroGrupo.id]]);
    });
    const inserir = (grupoId: string, vigencia: string, expulso: number) =>
      executarSql(
        `INSERT INTO config_pesos (grupo_id, vigente_desde, presenca_sem_chuva, presenca_com_chuva, lesionado_sem_chuva,
           lesionado_com_chuva, expulso, registrado_por, registrado_em) VALUES ($1, $2, 1, 1, 1, 1, $3, $4, $5)`,
        [grupoId, vigencia, expulso, base.contaId, AGORA],
      );
    expect(await codigoDoErro(inserir(base.grupo.id, VIGENCIA, -11))).toBe('23514');
    expect(await codigoDoErro(inserir(base.grupo.id, VIGENCIA, 11))).toBe('23514');
    expect(await codigoDoErro(inserir(base.grupo.id, dia(-2), -10))).toBeNull();
    expect(await codigoDoErro(inserir(base.grupo.id, dia(-1), 10))).toBeNull();
    expect(await codigoDoErro(inserir(base.grupo.id, VIGENCIA, -1))).toBeNull();
    expect(await codigoDoErro(inserir(base.grupo.id, VIGENCIA, -1))).toBe('23505');
    expect(await codigoDoErro(inserir(base.outroGrupo.id, VIGENCIA, -1))).toBeNull();
  });

  it('uma partida por grupo e data', async () => {
    const base = await criarBase(await abrir(), fabrica);
    const data = dia(-1);
    await inserirPartida(base.contaId, base.grupo.id, data);
    expect(await codigoDoErro(inserirPartida(base.contaId, base.grupo.id, data))).toBe('23505');
    expect(await codigoDoErro(inserirPartida(base.contaId, base.outroGrupo.id, data))).toBeNull();
  });

  it('presença: uma por partida e jogador, situação válida e jogador do mesmo grupo', async () => {
    const base = await criarBase(await abrir(), fabrica);
    const partida = await inserirPartida(base.contaId, base.grupo.id, dia(-8));
    const jogador = await inserirJogador(fabrica, base, base.grupo.id, 'Presente');
    const alheio = await inserirJogador(fabrica, base, base.outroGrupo.id, 'Alheio');
    const marcar = (jogadorId: string, situacao: string, grupoId = base.grupo.id) =>
      executarSql('INSERT INTO presencas (partida_id, jogador_id, grupo_id, situacao) VALUES ($1, $2, $3, $4)', [
        partida,
        jogadorId,
        grupoId,
        situacao,
      ]);
    expect(await codigoDoErro(marcar(jogador, 'ausente'))).toBe('23514');
    expect(await codigoDoErro(marcar(jogador, 'falta'))).toBe('23514');
    expect(await codigoDoErro(marcar(alheio, 'presente', base.outroGrupo.id))).toBe('23503');
    expect(await codigoDoErro(marcar(jogador, 'presente'))).toBeNull();
    expect(await codigoDoErro(marcar(jogador, 'expulso'))).toBe('23505');
    expect(await codigoDoErro(marcar(alheio, 'presente'))).toBe('23503');
  });

  it('apagar a partida apaga as presenças; apagar jogador com presença é recusado', async () => {
    const base = await criarBase(await abrir(), fabrica);
    const partida = await inserirPartida(base.contaId, base.grupo.id, dia(-15));
    const jogador = await inserirJogador(fabrica, base, base.grupo.id, 'Historico');
    await executarSql(
      "INSERT INTO presencas (partida_id, jogador_id, grupo_id, situacao) VALUES ($1, $2, $3, 'presente')",
      [partida, jogador, base.grupo.id],
    );
    expect(await codigoDoErro(executarSql('DELETE FROM jogadores WHERE id = $1', [jogador]))).toBe('23503');
    await executarSql('DELETE FROM partidas WHERE id = $1', [partida]);
    expect(await executarSql('SELECT 1 FROM presencas WHERE jogador_id = $1', [jogador])).toEqual([]);
  });
});
