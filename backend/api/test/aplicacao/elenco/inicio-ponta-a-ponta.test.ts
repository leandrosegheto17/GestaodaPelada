import { calcularRanking, PESOS_PADRAO } from '@pelada/dominio';
import { describe, expect, it } from 'vitest';
import { editarInicio } from '../../../src/aplicacao/elenco/inicio-editar.js';
import { previaInicio } from '../../../src/aplicacao/elenco/inicio-previa.js';
import { mensagemInicioDepoisDaSaida } from '../../../src/aplicacao/elenco/mensagens-periodos.js';
import { corrigirPeriodoDoJogador } from '../../../src/aplicacao/elenco/periodos-corrigir.js';
import { carregarHistoricoGrupo } from '../../../src/aplicacao/pontuacao/historico.js';
import { emTransacao, type Db } from '../../../src/infraestrutura/db/index.js';
import * as jogadores from '../../../src/infraestrutura/db/repositorios/jogadores.js';
import * as partidas from '../../../src/infraestrutura/db/repositorios/partidas.js';
import * as pesos from '../../../src/infraestrutura/db/repositorios/pesos.js';
import { montarCenario } from '../../apoio/cenario-acesso.js';
import { usarDb } from '../../apoio/db-teste.js';
import { criarJogador } from '../../apoio/fabricas/jogadores.js';
import { usarFabrica } from '../../apoio/fabrica.js';
import { AGORA_TESTE, diaRelativo as d, HOJE_TESTE as HOJE } from '../../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDb(fabrica);

/** Vandré (30 de inicial, 3 presenças), um rival com 40 e uma presença antiga, outro com 20 e nenhuma. */
async function cenario(db: Db) {
  const cen = await montarCenario(db, fabrica);
  const g = cen.grupoA.id;
  const autor = cen.adminA.id;
  await pesos.criarPadrao(db, g, {
    pesos: PESOS_PADRAO,
    vigenteDesde: d(-400),
    registradoPor: autor,
    agora: AGORA_TESTE,
  });
  const vandre = await criarJogador(db, g, autor, { apelido: 'Vandre', dataEntrada: d(-30), pontuacaoInicial: 30 });
  const rival = await criarJogador(db, g, autor, { apelido: 'Rival', pontuacaoInicial: 40 });
  const semPresenca = await criarJogador(db, g, autor, { apelido: 'Sem', pontuacaoInicial: 20 });
  const lancar = (data: string, presentes: string[]) =>
    emTransacao(db, (tx) =>
      partidas.criar(tx, g, {
        data,
        choveu: false,
        presencas: presentes.map((jogadorId) => ({ jogadorId, situacao: 'presente' as const })),
        autor,
        agora: AGORA_TESTE,
      }),
    );
  await lancar(d(-50), [rival]);
  for (const dia of [d(-20), d(-10), d(-5)]) await lancar(dia, [vandre]);
  return { db, g, vandre, rival, semPresenca, contexto: { hoje: HOJE, autor, agora: AGORA_TESTE } };
}

async function ranking(db: Db, g: string) {
  const historico = await carregarHistoricoGrupo(db, g, HOJE);
  const { linhas } = calcularRanking({ hoje: HOJE, mes: HOJE.slice(0, 7), ...historico });
  return new Map(linhas.map((l) => [l.jogadorId, l]));
}

describe('data de início: prévia, gravação e ranking', () => {
  it('Kim zera com S = hoje, recuar devolve, e recuar antes do 1º período não muda ponto', async () => {
    const { db, g, vandre, rival, semPresenca, contexto } = await cenario(await abrir());
    const antes = await ranking(db, g);
    expect([antes.get(vandre)?.posicao, antes.get(vandre)?.ptsFinal]).toEqual([2, 33]);

    const avancar = await previaInicio(db, g, vandre, HOJE, HOJE);
    expect(avancar).toMatchObject({ tipo: 'ok', previa: { acumuladoAntes: 33, acumuladoDepois: 0 } });
    await editarInicio(db, g, vandre, HOJE, contexto);
    const zerado = await ranking(db, g);
    expect([zerado.get(vandre)?.posicao, zerado.get(vandre)?.ptsFinal]).toEqual([3, 0]);
    expect(zerado.get(vandre)?.rodadas.every((r) => r.pontos === null)).toBe(true);
    expect(zerado.get(semPresenca)?.posicao).toBe(2);
    expect(zerado.get(rival)?.ptsFinal).toBe(antes.get(rival)?.ptsFinal);

    await editarInicio(db, g, vandre, d(-30), contexto);
    const devolvido = await ranking(db, g);
    expect([devolvido.get(vandre)?.posicao, devolvido.get(vandre)?.ptsFinal]).toEqual([2, 33]);

    await editarInicio(db, g, vandre, d(-60), contexto);
    const recuado = await ranking(db, g);
    for (const id of [vandre, rival, semPresenca]) {
      expect([recuado.get(id)?.posicao, recuado.get(id)?.ptsFinal]).toEqual([
        antes.get(id)?.posicao,
        antes.get(id)?.ptsFinal,
      ]);
    }
  });

  it('início depois da saída do 1º período recusa com a data limite; corrigir a saída libera, e antes do início volta a recusar', async () => {
    const { db, g, vandre, contexto } = await cenario(await abrir());
    await emTransacao(db, (tx) => jogadores.inativar(tx, g, vandre, d(-3)));
    const periodoId = (await jogadores.buscar(db, g, vandre))?.periodos[0]?.id ?? '';
    const corrigirSaida = (saida: string) => corrigirPeriodoDoJogador(db, g, vandre, periodoId, { saida }, contexto);
    const dataBr = (iso: string) => iso.split('-').reverse().join('/');

    const recusa = { tipo: 'invalida', mensagem: mensagemInicioDepoisDaSaida(d(-3)) };
    expect(await previaInicio(db, g, vandre, d(-2), HOJE)).toEqual(recusa);
    expect(await editarInicio(db, g, vandre, d(-2), contexto)).toEqual(recusa);
    expect(recusa.mensagem).toContain(`(${dataBr(d(-3))})`);
    expect(recusa.mensagem).toContain('Corrija antes a data de saída do primeiro período.');
    expect(await previaInicio(db, g, vandre, d(-3), HOJE)).toMatchObject({ tipo: 'ok' });

    expect(await corrigirSaida(d(-1))).toMatchObject({ tipo: 'ok' });
    expect(await previaInicio(db, g, vandre, d(-2), HOJE)).toMatchObject({ tipo: 'ok' });
    expect(await editarInicio(db, g, vandre, d(-2), contexto)).toMatchObject({ tipo: 'ok', inicio: d(-2) });

    const antes = await corrigirSaida(d(-4));
    expect(antes).toMatchObject({ tipo: 'invalida', campo: 'saida' });
    expect(antes).toMatchObject({ mensagem: expect.stringContaining(dataBr(d(-2))) });
  });
});
