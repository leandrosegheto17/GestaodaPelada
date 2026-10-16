import { describe, expect, it } from 'vitest';
import { usarDb } from '../apoio/db-teste.js';
import { usarFabrica } from '../apoio/fabrica.js';
import { criarBase, inserirJogador } from '../apoio/sql-dados.js';
import { codigoDoErro, executarSql } from '../apoio/sql.js';

const fabrica = usarFabrica();
const abrir = usarDb(fabrica);

async function inserirHabilidade(grupoId: string, nome: string): Promise<string> {
  const linhas = await executarSql<{ id: string }>(
    'INSERT INTO habilidades (grupo_id, nome) VALUES ($1, $2) RETURNING id',
    [grupoId, nome],
  );
  const id = linhas[0]?.id as string;
  fabrica.registrar(async () => {
    await executarSql('DELETE FROM notas WHERE habilidade_id = $1', [id]);
    await executarSql('DELETE FROM habilidades WHERE id = $1', [id]);
  });
  return id;
}

describe('migração de habilidades e notas', () => {
  it('nome repetido (sem caixa) no grupo é recusado; em outro grupo é aceito', async () => {
    const base = await criarBase(await abrir(), fabrica);
    await inserirHabilidade(base.grupo.id, 'Passe');
    expect(await codigoDoErro(inserirHabilidade(base.grupo.id, 'PASSE'))).toBe('23505');
    expect(await codigoDoErro(inserirHabilidade(base.outroGrupo.id, 'Passe'))).toBeNull();
  });

  it.each(['a', 'a'.repeat(31)])('nome de %# tamanho inválido é recusado', async (nome) => {
    const base = await criarBase(await abrir(), fabrica);
    expect(await codigoDoErro(inserirHabilidade(base.grupo.id, nome))).toBe('23514');
  });

  it('nota: valor de 1 a 10, única por jogador e habilidade, só dentro do mesmo grupo', async () => {
    const base = await criarBase(await abrir(), fabrica);
    const jogador = await inserirJogador(fabrica, base, base.grupo.id, 'Notas');
    const habilidade = await inserirHabilidade(base.grupo.id, 'Drible');
    const outra = await inserirHabilidade(base.outroGrupo.id, 'Chute');
    const nota = (grupoId: string, hab: string, valor: number) =>
      executarSql('INSERT INTO notas (jogador_id, habilidade_id, grupo_id, valor) VALUES ($1, $2, $3, $4)', [
        jogador,
        hab,
        grupoId,
        valor,
      ]);
    expect(await codigoDoErro(nota(base.grupo.id, habilidade, 0))).toBe('23514');
    expect(await codigoDoErro(nota(base.grupo.id, habilidade, 11))).toBe('23514');
    expect(await codigoDoErro(nota(base.grupo.id, habilidade, 8))).toBeNull();
    expect(await codigoDoErro(nota(base.grupo.id, habilidade, 9))).toBe('23505');
    expect(await codigoDoErro(nota(base.grupo.id, outra, 7))).toBe('23503');
  });

  it('apagar a habilidade apaga as notas dela', async () => {
    const base = await criarBase(await abrir(), fabrica);
    const jogador = await inserirJogador(fabrica, base, base.grupo.id, 'Cascata');
    const habilidade = await inserirHabilidade(base.grupo.id, 'Desarme');
    await executarSql('INSERT INTO notas (jogador_id, habilidade_id, grupo_id, valor) VALUES ($1, $2, $3, 6)', [
      jogador,
      habilidade,
      base.grupo.id,
    ]);
    await executarSql('DELETE FROM habilidades WHERE id = $1', [habilidade]);
    expect(await executarSql('SELECT 1 FROM notas WHERE jogador_id = $1', [jogador])).toEqual([]);
  });
});
