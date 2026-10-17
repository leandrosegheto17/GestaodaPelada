import { describe, expect, it } from 'vitest';
import { MarcacaoInvalida, prepararPresencas, validarMarcacoes } from '../../../src/aplicacao/partidas/presencas.js';
import { emTransacao } from '../../../src/infraestrutura/db/index.js';
import * as jogadores from '../../../src/infraestrutura/db/repositorios/jogadores.js';
import { montarCenario } from '../../apoio/cenario-acesso.js';
import { usarDb } from '../../apoio/db-teste.js';
import { usarFabrica } from '../../apoio/fabrica.js';
import { criarJogador } from '../../apoio/fabricas/jogadores.js';
import { diaRelativo, relogioFixo } from '../../apoio/relogio.js';

const ativos = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

describe('validarMarcacoes', () => {
  it('ausente não vira linha e a contagem separa presentes, lesionados e expulsos', () => {
    const r = validarMarcacoes(ativos, [
      { jogadorId: 'a', situacao: 'presente' },
      { jogadorId: 'b', situacao: 'lesionado' },
      { jogadorId: 'c', situacao: 'ausente' },
    ]);
    expect(r.linhas).toEqual([
      { jogadorId: 'a', situacao: 'presente' },
      { jogadorId: 'b', situacao: 'lesionado' },
    ]);
    expect(r.contagem).toEqual({ presentes: 1, lesionados: 1, expulsos: 0 });
  });

  it('jogador não marcado é ausente (sem linha); lista vazia é válida', () => {
    expect(validarMarcacoes(ativos, []).linhas).toEqual([]);
  });

  it('reúne todos os problemas: repetido e fora dos ativos (inclusive de outro grupo)', () => {
    let erro: unknown;
    try {
      validarMarcacoes(ativos, [
        { jogadorId: 'a', situacao: 'presente' },
        { jogadorId: 'a', situacao: 'expulso' },
        { jogadorId: 'x', situacao: 'presente' },
      ]);
    } catch (e) {
      erro = e;
    }
    expect(erro).toBeInstanceOf(MarcacaoInvalida);
    expect((erro as MarcacaoInvalida).problemas).toEqual([
      { indice: 1, jogadorId: 'a', motivo: 'repetido' },
      { indice: 2, jogadorId: 'x', motivo: 'inativo_ou_fora_do_grupo' },
    ]);
  });
});

describe('prepararPresencas (banco)', () => {
  const fabrica = usarFabrica();
  const abrir = usarDb(fabrica);
  const hoje = relogioFixo(diaRelativo(0)).hoje();

  const erroDe = async (p: Promise<unknown>) => {
    try {
      await p;
    } catch (e) {
      return e as MarcacaoInvalida;
    }
    throw new Error('esperava MarcacaoInvalida');
  };

  it('recusa entrada futura, de outro grupo e inativo na data; aceita a véspera da saída', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const ativo = await criarJogador(db, cen.grupoA.id, cen.adminA.id, { dataEntrada: diaRelativo(-10) });
    const futuro = await criarJogador(db, cen.grupoA.id, cen.adminA.id, { dataEntrada: diaRelativo(1) });
    const saiu = await criarJogador(db, cen.grupoA.id, cen.adminA.id, { dataEntrada: diaRelativo(-10) });
    await jogadores.inativar(db, cen.grupoA.id, saiu, hoje);
    const deOutro = await criarJogador(db, cen.grupoB.id, cen.adminB.id, { dataEntrada: diaRelativo(-10) });

    const marcar = (...ids: string[]) => ids.map((jogadorId) => ({ jogadorId, situacao: 'presente' as const }));
    const ok = await prepararPresencas(db, cen.grupoA.id, hoje, marcar(ativo));
    expect(ok.contagem.presentes).toBe(1);
    const erro = await erroDe(prepararPresencas(db, cen.grupoA.id, hoje, marcar(futuro, saiu, deOutro)));
    expect(erro.problemas.map((p) => p.indice)).toEqual([0, 1, 2]);
    expect(new Set(erro.problemas.map((p) => p.motivo))).toEqual(new Set(['inativo_ou_fora_do_grupo']));
    const vespera = await prepararPresencas(db, cen.grupoA.id, diaRelativo(-1), marcar(saiu));
    expect(vespera.linhas).toHaveLength(1);
  });

  it('funciona dentro de uma transação', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const id = await criarJogador(db, cen.grupoA.id, cen.adminA.id, { dataEntrada: diaRelativo(-10) });
    const r = await emTransacao(db, (tx) =>
      prepararPresencas(tx, cen.grupoA.id, hoje, [{ jogadorId: id, situacao: 'expulso' }]),
    );
    expect(r.contagem).toEqual({ presentes: 0, lesionados: 0, expulsos: 1 });
  });
});
