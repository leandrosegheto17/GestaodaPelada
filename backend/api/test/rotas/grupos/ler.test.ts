import { grupoDetalhe } from '@pelada/contrato';
import { PESOS_PADRAO } from '@pelada/dominio';
import { describe, expect, it } from 'vitest';
import { emTransacao } from '../../../src/infraestrutura/db/index.js';
import * as escalacoes from '../../../src/infraestrutura/db/repositorios/escalacoes.js';
import * as eventos from '../../../src/infraestrutura/db/repositorios/eventos.js';
import * as habilidades from '../../../src/infraestrutura/db/repositorios/habilidades.js';
import * as jogadores from '../../../src/infraestrutura/db/repositorios/jogadores.js';
import * as partidas from '../../../src/infraestrutura/db/repositorios/partidas.js';
import * as pesos from '../../../src/infraestrutura/db/repositorios/pesos.js';
import { montarCenario } from '../../apoio/cenario-acesso.js';
import { clienteTeste } from '../../apoio/cliente.js';
import { usarDbDoWorker } from '../../apoio/db-worker.js';
import { criarConfig, criarLancamento } from '../../apoio/fabricas/financeiro.js';
import { criarJogador } from '../../apoio/fabricas/jogadores.js';
import { usarFabrica } from '../../apoio/fabrica.js';
import { relogioFixo } from '../../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);
// 2026-10-22 é quinta-feira, o dia de jogo do grupo de fábrica
const HOJE = '2026-10-22';
const AGORA = new Date('2026-10-22T15:00:00Z');
const cliente = (cookie: string) => clienteTeste({ relogio: relogioFixo(HOJE, '12:00'), cookie });

describe('GET /api/grupos/:grupoId (workerd)', () => {
  it('traz o resumo do início, com as permissões de quem pede', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    await jogadoresEPartidas(db, g, cen.adminA.id);

    const r = await cliente(cen.adminA.cookie).get(`/api/grupos/${g}`);
    expect(r.status).toBe(200);
    const detalhe = grupoDetalhe.parse(r.corpo);
    expect(detalhe.permissoes.acessaFinanceiro).toBe(true);
    expect(detalhe.grupo.urlPublica).toMatch(new RegExp(`/g/${cen.grupoA.slug}$`));
    expect(detalhe.hoje).toBe(HOJE);
    expect(detalhe.inicio).toMatchObject({
      dataSugeridaPartida: HOJE,
      partidaNaDataSugerida: true,
      proximoDiaDeJogo: HOJE,
      partidasNoMes: 1,
      jogadoresAtivos: 2,
      habilidades: 1,
      pesosVigentesDesde: '2026-01-01',
      admins: 2,
      aparelhosNaSemana: 1,
      escalacaoConfirmadaPara: null,
      saldoAtualCentavos: null,
    });
  });

  it('escalacaoConfirmadaPara: a data do próximo jogo quando há escalação; senão nulo (outra data e outro grupo não contam)', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const base = { formato: 'varios_times' as const, n: 2, k: null, composicao: { times: [] }, confirmadaEm: AGORA };
    const ler = async (cookie: string) =>
      grupoDetalhe.parse((await cliente(cookie).get(`/api/grupos/${g}`)).corpo).inicio.escalacaoConfirmadaPara;

    expect(await ler(cen.adminA.cookie)).toBeNull();
    await escalacoes.confirmar(db, g, { ...base, data: '2026-10-15', confirmadaPor: cen.adminA.id });
    await escalacoes.confirmar(db, cen.grupoB.id, { ...base, data: HOJE, confirmadaPor: cen.adminB.id });
    expect(await ler(cen.adminA.cookie)).toBeNull();
    await escalacoes.confirmar(db, g, { ...base, data: HOJE, confirmadaPor: cen.adminA.id });
    expect(await ler(cen.adminA.cookie)).toBe(HOJE);
    expect(await ler(cen.adminASemFinanceiro.cookie)).toBe(HOJE);
  });

  it('saldoAtualCentavos: só para quem tem o financeiro; sem configuração é nulo; o caixa de outro grupo não entra', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const saldoDe = async (cookie: string) =>
      grupoDetalhe.parse((await cliente(cookie).get(`/api/grupos/${g}`)).corpo).inicio.saldoAtualCentavos;

    expect(await saldoDe(cen.adminA.cookie)).toBeNull();
    await criarConfig(db, g, { saldoInicialCentavos: 35_000, dataSaldoInicial: '2026-02-05' });
    await criarLancamento(db, g, cen.adminA.id, { tipo: 'entrada', data: '2026-10-01', valorCentavos: 20_000 });
    await criarLancamento(db, g, cen.adminA.id, { tipo: 'saida', data: '2026-10-05', valorCentavos: 80_000 });
    await criarConfig(db, cen.grupoB.id, { saldoInicialCentavos: 999_999 });
    expect(await saldoDe(cen.adminA.cookie)).toBe(35_000 + 20_000 - 80_000);
    expect(await saldoDe(cen.adminASemFinanceiro.cookie)).toBeNull();
  });

  it('numa sexta: sugerida é a quinta anterior e o próximo jogo é a quinta seguinte; sem partida na data, false', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const sexta = clienteTeste({ relogio: relogioFixo('2026-10-23', '12:00'), cookie: cen.adminA.cookie });
    const ler = async () => grupoDetalhe.parse((await sexta.get(`/api/grupos/${g}`)).corpo).inicio;

    expect(await ler()).toMatchObject({
      dataSugeridaPartida: HOJE,
      proximoDiaDeJogo: '2026-10-29',
      partidaNaDataSugerida: false,
    });
    const a = await criarJogador(db, g, cen.adminA.id, { dataEntrada: '2026-01-01' });
    await criarPartida(db, g, cen.adminA.id, '2026-10-29', a);
    expect((await ler()).partidaNaDataSugerida).toBe(false);
    await criarPartida(db, g, cen.adminA.id, HOJE, a);
    expect((await ler()).partidaNaDataSugerida).toBe(true);
  });

  it('jogadoresAtivos: quem saiu antes de hoje não conta', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    await criarJogador(db, g, cen.adminA.id, { dataEntrada: '2026-01-01' });
    const saiu = await criarJogador(db, g, cen.adminA.id, { dataEntrada: '2026-01-01' });
    const lerAtivos = async () =>
      grupoDetalhe.parse((await cliente(cen.adminA.cookie).get(`/api/grupos/${g}`)).corpo).inicio.jogadoresAtivos;

    expect(await lerAtivos()).toBe(2);
    expect(await jogadores.inativar(db, g, saiu, '2026-10-10')).toBe('ok');
    expect(await lerAtivos()).toBe(1);
  });

  it('partidasNoMes e aparelhosNaSemana: outro mês, outra semana e o grupo B não contam', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const a = await criarJogador(db, g, cen.adminA.id, { dataEntrada: '2026-01-01' });
    const b = await criarJogador(db, cen.grupoB.id, cen.adminB.id, { dataEntrada: '2026-01-01' });
    const lerInicio = async () =>
      grupoDetalhe.parse((await cliente(cen.adminA.cookie).get(`/api/grupos/${g}`)).corpo).inicio;
    const aparelho = (n: number) => `123e4567-e89b-12d3-a456-4266141740${String(n).padStart(2, '0')}`;
    const evento = (grupoId: string, n: number, momento: Date) =>
      eventos.registrar(db, grupoId, { tipo: 'ranking_aberto', dispositivoId: aparelho(n), momento });

    await criarPartida(db, g, cen.adminA.id, '2026-09-24', a);
    await criarPartida(db, cen.grupoB.id, cen.adminB.id, HOJE, b);
    await evento(g, 1, new Date('2026-10-14T15:00:00Z'));
    await evento(cen.grupoB.id, 2, AGORA);
    expect(await lerInicio()).toMatchObject({ partidasNoMes: 0, aparelhosNaSemana: 0 });

    await criarPartida(db, g, cen.adminA.id, '2026-10-15', a);
    await evento(g, 3, AGORA);
    expect(await lerInicio()).toMatchObject({ partidasNoMes: 1, aparelhosNaSemana: 1 });
  });

  it('sem financeiro: acessaFinanceiro false; admin de outro grupo: 404', async () => {
    const cen = await montarCenario(await abrir(), fabrica);
    const sem = await cliente(cen.adminASemFinanceiro.cookie).get(`/api/grupos/${cen.grupoA.id}`);
    expect(sem.status).toBe(200);
    expect((sem.corpo as { permissoes: { acessaFinanceiro: boolean } }).permissoes.acessaFinanceiro).toBe(false);
    expect((await cliente(cen.adminB.cookie).get(`/api/grupos/${cen.grupoA.id}`)).status).toBe(404);
  });
});

async function criarPartida(
  db: Awaited<ReturnType<typeof abrir>>,
  grupoId: string,
  autor: string,
  data: string,
  jogadorId: string,
) {
  await emTransacao(db, (tx) =>
    partidas.criar(tx, grupoId, {
      data,
      choveu: false,
      presencas: [{ jogadorId, situacao: 'presente' }],
      autor,
      agora: AGORA,
    }),
  );
}

async function jogadoresEPartidas(db: Awaited<ReturnType<typeof abrir>>, grupoId: string, autor: string) {
  const a = await criarJogador(db, grupoId, autor, { dataEntrada: '2026-01-01' });
  await criarJogador(db, grupoId, autor, { dataEntrada: '2026-01-01' });
  await habilidades.criar(db, grupoId, 'Passe');
  await pesos.criarPadrao(db, grupoId, {
    pesos: PESOS_PADRAO,
    vigenteDesde: '2026-01-01',
    registradoPor: autor,
    agora: AGORA,
  });
  await criarPartida(db, grupoId, autor, HOJE, a);
  await eventos.registrar(db, grupoId, {
    tipo: 'ranking_aberto',
    dispositivoId: '123e4567-e89b-12d3-a456-426614174000',
    momento: AGORA,
  });
}
