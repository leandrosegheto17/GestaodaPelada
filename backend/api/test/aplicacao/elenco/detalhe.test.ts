import { jogadorDetalhe } from '@pelada/contrato';
import { describe, expect, it } from 'vitest';
import { carregarDetalhe } from '../../../src/aplicacao/elenco/detalhe.js';
import { emTransacao } from '../../../src/infraestrutura/db/index.js';
import * as habilidades from '../../../src/infraestrutura/db/repositorios/habilidades.js';
import * as jogadores from '../../../src/infraestrutura/db/repositorios/jogadores.js';
import { montarCenario } from '../../apoio/cenario-acesso.js';
import { usarDb } from '../../apoio/db-teste.js';
import { criarJogador } from '../../apoio/fabricas/jogadores.js';
import { usarFabrica } from '../../apoio/fabrica.js';

const fabrica = usarFabrica();
const abrir = usarDb(fabrica);
const HOJE = '2026-10-22';

describe('carregarDetalhe (workerd)', () => {
  it('seis notas dão nível 6.8 e a forma de jogador-toninho', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const id = await emTransacao(db, (tx) =>
      jogadores.criar(tx, g, {
        apelido: 'Toninho',
        anoNascimento: 1978,
        posicao: 'atacante',
        telefone: '11987654321',
        dataEntrada: '2026-02-05',
        autor: cen.adminA.id,
        agora: new Date('2026-10-16T12:00:00Z'),
      }),
    );
    const nomes = ['Visão de Jogo', 'Passe', 'Preparo Físico', 'Drible', 'Chute', 'Desarme'];
    const valores = [8, 7, 6, 7, 8, 5];
    for (const [i, nome] of nomes.entries()) {
      await habilidades.gravarNota(db, g, id, await habilidades.criar(db, g, nome), valores[i] as number);
    }
    const d = await carregarDetalhe(db, g, id, HOJE);
    expect(jogadorDetalhe.safeParse(d).success).toBe(true);
    expect(d).toMatchObject({
      id,
      apelido: 'Toninho',
      anoNascimento: 1978,
      posicao: 'atacante',
      telefone: '11987654321',
      situacao: { ativo: true, desde: '2026-02-05' },
      nivel: 6.8,
      semNota: false,
    });
    expect(d?.notas.map((n) => [n.habilidade, n.nota])).toEqual(nomes.map((n, i) => [n, valores[i]]));
  });

  it('grupo sem catálogo: notas vazias, semNota true', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const id = await criarJogador(db, cen.grupoA.id, cen.adminA.id);
    const d = await carregarDetalhe(db, cen.grupoA.id, id, HOJE);
    expect(d).toMatchObject({ notas: [], semNota: true, telefone: null });
    expect(jogadorDetalhe.safeParse(d).success).toBe(true);
  });

  it('duas habilidades e uma nota: a outra é null e o nível vem só da nota dada', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const id = await criarJogador(db, g, cen.adminA.id);
    const passe = await habilidades.criar(db, g, 'Passe');
    await habilidades.criar(db, g, 'Chute');
    await habilidades.gravarNota(db, g, id, passe, 9);
    const d = await carregarDetalhe(db, g, id, HOJE);
    expect(d?.notas.map((n) => n.nota)).toEqual([9, null]);
    expect(d).toMatchObject({ nivel: 9, semNota: false });
  });

  it('inativo: desde é a saída; reativado: desde é o início do novo período', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const id = await criarJogador(db, g, cen.adminA.id, { dataEntrada: '2026-02-05' });
    await jogadores.inativar(db, g, id, '2026-08-10');
    expect((await carregarDetalhe(db, g, id, HOJE))?.situacao).toEqual({ ativo: false, desde: '2026-08-10' });
    await jogadores.reativar(db, g, id, '2026-09-14');
    expect((await carregarDetalhe(db, g, id, HOJE))?.situacao).toEqual({ ativo: true, desde: '2026-09-14' });
  });

  it('jogador de outro grupo ou inexistente dá null', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const id = await criarJogador(db, cen.grupoA.id, cen.adminA.id);
    expect(await carregarDetalhe(db, cen.grupoB.id, id, HOJE)).toBeNull();
  });
});
