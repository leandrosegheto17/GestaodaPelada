import { HABILIDADES_INICIAIS } from '@pelada/dominio';
import { describe, expect, it } from 'vitest';
import * as habilidades from '../../src/infraestrutura/db/repositorios/habilidades.js';
import { NomeHabilidadeEmUso } from '../../src/infraestrutura/db/repositorios/habilidades.js';
import { contarConsultas } from '../apoio/contar-consultas.js';
import { usarDb } from '../apoio/db-teste.js';
import { criarJogador } from '../apoio/fabricas/jogadores.js';
import { usarFabrica } from '../apoio/fabrica.js';
import { criarBase } from '../apoio/sql-dados.js';

const fabrica = usarFabrica();
const abrir = usarDb(fabrica);
const INICIAIS = HABILIDADES_INICIAIS;

describe('repositório de habilidades', () => {
  it('catálogo inicial na ordem da RN-18; repetir não duplica', async () => {
    const db = await abrir();
    const base = await criarBase(db, fabrica);
    await habilidades.criarCatalogoInicial(db, base.grupo.id, INICIAIS);
    expect((await habilidades.listar(db, base.grupo.id)).map((h) => h.nome)).toEqual(INICIAIS);
    await expect(habilidades.criarCatalogoInicial(db, base.grupo.id, INICIAIS)).rejects.toBeInstanceOf(
      NomeHabilidadeEmUso,
    );
    expect(await habilidades.listar(db, base.grupo.id)).toHaveLength(6);
  });

  it('nome repetido sem caixa é recusado; em outro grupo é aceito; renomear mantém as notas', async () => {
    const db = await abrir();
    const base = await criarBase(db, fabrica);
    const passe = await habilidades.criar(db, base.grupo.id, 'Passe');
    await expect(habilidades.criar(db, base.grupo.id, 'passe')).rejects.toBeInstanceOf(NomeHabilidadeEmUso);
    await expect(habilidades.criar(db, base.outroGrupo.id, 'Passe')).resolves.toBeTypeOf('string');
    const jogador = await criarJogador(db, base.grupo.id, base.contaId);
    await habilidades.gravarNota(db, base.grupo.id, jogador, passe, 8);
    const chute = await habilidades.criar(db, base.grupo.id, 'Chute');
    await expect(habilidades.renomear(db, base.grupo.id, chute, 'PASSE')).rejects.toBeInstanceOf(NomeHabilidadeEmUso);
    expect(await habilidades.renomear(db, base.grupo.id, passe, 'Passe Longo')).toBe(true);
    expect((await habilidades.notasDoJogador(db, base.grupo.id, jogador))[0]).toEqual({
      habilidadeId: passe,
      habilidade: 'Passe Longo',
      nota: 8,
    });
    expect(await habilidades.renomear(db, base.outroGrupo.id, passe, 'Outro')).toBe(false);
  });

  it('excluir apaga a habilidade e as notas dela, não as de outras', async () => {
    const db = await abrir();
    const base = await criarBase(db, fabrica);
    const a = await habilidades.criar(db, base.grupo.id, 'Alfa');
    const b = await habilidades.criar(db, base.grupo.id, 'Beta');
    const jogador = await criarJogador(db, base.grupo.id, base.contaId);
    await habilidades.gravarNota(db, base.grupo.id, jogador, a, 5);
    await habilidades.gravarNota(db, base.grupo.id, jogador, b, 6);
    expect(await habilidades.excluir(db, base.outroGrupo.id, a)).toBe(false);
    expect(await habilidades.excluir(db, base.grupo.id, a)).toBe(true);
    expect(await habilidades.notasDoGrupo(db, base.grupo.id)).toEqual([
      { jogadorId: jogador, habilidadeId: b, nota: 6 },
    ]);
  });

  it('gravarNota cria e atualiza; apagarNota remove; só dentro do grupo', async () => {
    const db = await abrir();
    const base = await criarBase(db, fabrica);
    const hab = await habilidades.criar(db, base.grupo.id, 'Drible');
    const habAlheia = await habilidades.criar(db, base.outroGrupo.id, 'Chute');
    const jogador = await criarJogador(db, base.grupo.id, base.contaId);
    expect(await habilidades.gravarNota(db, base.grupo.id, jogador, hab, 7)).toBe(true);
    expect(await habilidades.gravarNota(db, base.grupo.id, jogador, hab, 9)).toBe(true);
    expect(await habilidades.notasDoGrupo(db, base.grupo.id)).toEqual([
      { jogadorId: jogador, habilidadeId: hab, nota: 9 },
    ]);
    expect(await habilidades.gravarNota(db, base.grupo.id, jogador, habAlheia, 5)).toBe(false);
    expect(await habilidades.gravarNota(db, base.outroGrupo.id, jogador, habAlheia, 5)).toBe(false);
    expect(await habilidades.apagarNota(db, base.outroGrupo.id, jogador, hab)).toBe(false);
    expect(await habilidades.apagarNota(db, base.grupo.id, jogador, hab)).toBe(true);
    expect(await habilidades.notasDoGrupo(db, base.grupo.id)).toEqual([]);
  });

  it('notasDoJogador traz o catálogo com nota nula onde não há', async () => {
    const db = await abrir();
    const base = await criarBase(db, fabrica);
    await habilidades.criarCatalogoInicial(db, base.grupo.id, INICIAIS);
    const jogador = await criarJogador(db, base.grupo.id, base.contaId);
    const todas = await habilidades.notasDoJogador(db, base.grupo.id, jogador);
    expect(todas.map((n) => n.habilidade)).toEqual(INICIAIS);
    expect(todas.every((n) => n.nota === null)).toBe(true);
  });

  it('isolamento: notasDoGrupo não traz notas de outro grupo; grupo A não mexe no B', async () => {
    const db = await abrir();
    const base = await criarBase(db, fabrica);
    const habB = await habilidades.criar(db, base.outroGrupo.id, 'Chute');
    const jogadorB = await criarJogador(db, base.outroGrupo.id, base.contaId);
    expect(await habilidades.gravarNota(db, base.outroGrupo.id, jogadorB, habB, 4)).toBe(true);
    const hab = await habilidades.criar(db, base.grupo.id, 'Passe');
    const jogador = await criarJogador(db, base.grupo.id, base.contaId);
    expect(await habilidades.gravarNota(db, base.grupo.id, jogadorB, hab, 5)).toBe(false);
    expect(await habilidades.gravarNota(db, base.grupo.id, jogador, habB, 5)).toBe(false);
    expect(await habilidades.notasDoGrupo(db, base.grupo.id)).toEqual([]);
    expect(await habilidades.excluir(db, base.grupo.id, habB)).toBe(false);
    expect(await habilidades.apagarNota(db, base.grupo.id, jogadorB, habB)).toBe(false);
    expect(await habilidades.notasDoGrupo(db, base.outroGrupo.id)).toEqual([
      { jogadorId: jogadorB, habilidadeId: habB, nota: 4 },
    ]);
  });

  it('notasDoGrupo é uma consulta só (3 jogadores x 6 habilidades)', async () => {
    const db = await abrir();
    const base = await criarBase(db, fabrica);
    await habilidades.criarCatalogoInicial(db, base.grupo.id, INICIAIS);
    const catalogo = await habilidades.listar(db, base.grupo.id);
    for (let i = 0; i < 3; i++) {
      const jogador = await criarJogador(db, base.grupo.id, base.contaId);
      for (const h of catalogo) await habilidades.gravarNota(db, base.grupo.id, jogador, h.id, 5);
    }
    let notas: Awaited<ReturnType<typeof habilidades.notasDoGrupo>> = [];
    const consultas = await contarConsultas(async () => {
      notas = await habilidades.notasDoGrupo(db, base.grupo.id);
    });
    expect(notas).toHaveLength(18);
    expect(consultas).toBe(1);
  });
});
