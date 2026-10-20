import type { EntradaSimulador } from '@pelada/contrato';
import { PESOS_PADRAO } from '@pelada/dominio';
import { describe, expect, it } from 'vitest';
import { AptoInvalido, montarEntradaSimulador } from '../../../src/aplicacao/simulador/entrada.js';
import { emTransacao } from '../../../src/infraestrutura/db/index.js';
import * as habilidades from '../../../src/infraestrutura/db/repositorios/habilidades.js';
import * as jogadores from '../../../src/infraestrutura/db/repositorios/jogadores.js';
import * as partidas from '../../../src/infraestrutura/db/repositorios/partidas.js';
import * as pesos from '../../../src/infraestrutura/db/repositorios/pesos.js';
import { contarConsultas } from '../../apoio/contar-consultas.js';
import { usarDb } from '../../apoio/db-teste.js';
import { criarJogador } from '../../apoio/fabricas/jogadores.js';
import { usarFabrica } from '../../apoio/fabrica.js';
import { AGORA_TESTE as AGORA, diaRelativo, HOJE_TESTE } from '../../apoio/relogio.js';
import { criarBase } from '../../apoio/sql-dados.js';

const fabrica = usarFabrica();
const abrir = usarDb(fabrica);

async function cenario() {
  const db = await abrir();
  const base = await criarBase(db, fabrica);
  await pesos.criarPadrao(db, base.grupo.id, {
    pesos: PESOS_PADRAO,
    vigenteDesde: '2026-01-01',
    registradoPor: base.contaId,
    agora: AGORA,
  });
  return { db, base, g: base.grupo.id };
}

const dois = (data: string, aptos: { id: string; so1oTempo?: boolean }[]): EntradaSimulador => ({
  formato: 'dois_times',
  data,
  n: 2,
  k: 2,
  aptos: aptos.map((a) => ({ id: a.id, so1oTempo: a.so1oTempo ?? false })),
});

async function lancar(
  db: Awaited<ReturnType<typeof abrir>>,
  g: string,
  autor: string,
  data: string,
  presentes: string[],
) {
  await emTransacao(db, (tx) =>
    partidas.criar(tx, g, {
      data,
      choveu: false,
      presencas: presentes.map((jogadorId) => ({ jogadorId, situacao: 'presente' as const })),
      autor,
      agora: AGORA,
    }),
  );
}

describe('montarEntradaSimulador', () => {
  it('prioridade: a partida da véspera conta; a da própria data não; a ordem de entrada não influi', async () => {
    const { db, base, g } = await cenario();
    const a = await criarJogador(db, g, base.contaId, { apelido: 'Ana', ano: 1990 });
    const b = await criarJogador(db, g, base.contaId, { apelido: 'Bia', ano: 1990 });
    await lancar(db, g, base.contaId, '2026-10-14', [b]);
    await lancar(db, g, base.contaId, '2026-10-15', [a]);
    const ordem = async (ids: string[], data: string) =>
      (
        await montarEntradaSimulador(
          db,
          g,
          dois(
            data,
            ids.map((id) => ({ id })),
          ),
        )
      ).aptos.map((x) => x.id);
    // até 14/10 só Bia pontuou; a partir de 16/10 as duas (Ana desempata por apelido)
    expect(await ordem([a, b], '2026-10-15')).toEqual([b, a]);
    expect(await ordem([b, a], '2026-10-15')).toEqual([b, a]);
    expect(await ordem([a, b], '2026-10-16')).toEqual([a, b]);
  });

  it('nível × 100 (683, ou 550 sem nota), idade pelo ano da data e so1oTempo preservado; sem campos extras', async () => {
    const { db, base, g } = await cenario();
    const a = await criarJogador(db, g, base.contaId, { apelido: 'Ana', ano: 1990 });
    const b = await criarJogador(db, g, base.contaId, { apelido: 'Bia', ano: 1980 });
    for (const [i, nota] of [8, 7, 6, 7, 8, 5].entries()) {
      const h = await habilidades.criar(db, g, `Hab ${i}`);
      await habilidades.gravarNota(db, g, a, h, nota);
    }
    const r = await montarEntradaSimulador(db, g, dois('2027-01-07', [{ id: a, so1oTempo: true }, { id: b }]));
    const ana = r.aptos.find((x) => x.id === a);
    const bia = r.aptos.find((x) => x.id === b);
    expect(ana).toEqual({ id: a, so1oTempo: true, nivel: 683, semNota: false, idade: 37 });
    expect(bia).toEqual({ id: b, so1oTempo: false, nivel: 550, semNota: true, idade: 47 });
    expect(r.apelidos.get(a)).toBe('Ana');
  });

  it('partida na própria data não conta, mesmo quando contá-la inverteria a ordem', async () => {
    const { db, base, g } = await cenario();
    const data = diaRelativo(-1);
    const ana = await criarJogador(db, g, base.contaId, { apelido: 'Ana', ano: 1990 });
    const bia = await criarJogador(db, g, base.contaId, { apelido: 'Bia', ano: 1990 });
    await lancar(db, g, base.contaId, diaRelativo(-2), [bia]);
    await lancar(db, g, base.contaId, data, [ana]);
    const r = await montarEntradaSimulador(db, g, dois(data, [{ id: ana }, { id: bia }]));
    // contando a partida de `data`, as duas teriam 1 ponto e Ana (apelido) viria primeiro
    expect(r.aptos.map((x) => x.id)).toEqual([bia, ana]);
    expect(r.historico.partidas.every((p) => p.data < data)).toBe(true);
  });

  it('nota de outro grupo não interfere no nível', async () => {
    const { db, base, g } = await cenario();
    const ana = await criarJogador(db, g, base.contaId, { apelido: 'Ana', ano: 1990 });
    const bia = await criarJogador(db, g, base.contaId, { apelido: 'Bia', ano: 1990 });
    const outro = await criarJogador(db, base.outroGrupo.id, base.contaId);
    for (const [i, nota] of [8, 7, 6, 7, 8, 5].entries()) {
      const h = await habilidades.criar(db, g, `Hab ${i}`);
      await habilidades.gravarNota(db, g, ana, h, nota);
    }
    for (const i of [0, 1, 2]) {
      const h = await habilidades.criar(db, base.outroGrupo.id, `Hab ${i}`);
      await habilidades.gravarNota(db, base.outroGrupo.id, outro, h, 10);
    }
    const r = await montarEntradaSimulador(db, g, dois(diaRelativo(3), [{ id: ana }, { id: bia }]));
    expect(r.aptos.find((x) => x.id === ana)).toMatchObject({ nivel: 683, semNota: false });
    expect(r.aptos.find((x) => x.id === bia)).toMatchObject({ nivel: 550, semNota: true });
    expect(r.aptos.map((x) => x.id)).not.toContain(outro);
  });

  it('idade usa só o ano da data: igual em janeiro e em dezembro', async () => {
    const { db, base, g } = await cenario();
    const ano = Number(HOJE_TESTE.slice(0, 4)) + 1;
    const a = await criarJogador(db, g, base.contaId, { apelido: 'Ana', ano: 1990 });
    for (const data of [`${ano}-01-01`, `${ano}-12-31`]) {
      const r = await montarEntradaSimulador(db, g, dois(data, [{ id: a }]));
      expect(r.aptos[0]?.idade).toBe(ano - 1990);
    }
  });

  it('faz no máximo 5 consultas, independentemente do número de aptos', async () => {
    const { db, base, g } = await cenario();
    const ids: string[] = [];
    for (let i = 0; i < 8; i++) ids.push(await criarJogador(db, g, base.contaId));
    await lancar(db, g, base.contaId, diaRelativo(-1), ids.slice(0, 4));
    const entrada = dois(
      diaRelativo(3),
      ids.map((id) => ({ id })),
    );
    const consultas = await contarConsultas(() => montarEntradaSimulador(db, g, entrada));
    expect(consultas).toBeGreaterThan(0);
    expect(consultas).toBeLessThanOrEqual(5);
  });

  it('em vários times, so1oTempo é sempre falso', async () => {
    const { db, base, g } = await cenario();
    const a = await criarJogador(db, g, base.contaId);
    const r = await montarEntradaSimulador(db, g, {
      formato: 'varios_times',
      data: '2026-10-22',
      n: 4,
      aptos: [{ id: a }],
    });
    expect(r.aptos[0]?.so1oTempo).toBe(false);
  });

  it('id de outro grupo, inexistente ou inativo na data: AptoInvalido só com os ruins', async () => {
    const { db, base, g } = await cenario();
    const bom = await criarJogador(db, g, base.contaId);
    const saiu = await criarJogador(db, g, base.contaId);
    await jogadores.inativar(db, g, saiu, '2026-10-22');
    const doOutro = await criarJogador(db, base.outroGrupo.id, base.contaId);
    const inexistente = '00000000-0000-4000-8000-000000000000';
    const tentativa = montarEntradaSimulador(
      db,
      g,
      dois('2026-10-22', [{ id: bom }, { id: saiu }, { id: doOutro }, { id: inexistente }]),
    );
    await expect(tentativa).rejects.toBeInstanceOf(AptoInvalido);
    await expect(tentativa).rejects.toMatchObject({ ids: [saiu, doOutro, inexistente] });
    // no dia anterior à saída o jogador ainda estava ativo
    await expect(montarEntradaSimulador(db, g, dois('2026-10-21', [{ id: saiu }]))).resolves.toBeDefined();
  });
});
