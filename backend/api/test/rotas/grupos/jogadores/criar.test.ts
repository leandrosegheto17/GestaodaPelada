import { jogadorDetalhe } from '@pelada/contrato';
import { describe, expect, it } from 'vitest';
import { kyselyDe } from '../../../../src/infraestrutura/db/cliente.js';
import { montarCenario } from '../../../apoio/cenario-acesso.js';
import { clienteTeste } from '../../../apoio/cliente.js';
import { usarDbDoWorker } from '../../../apoio/db-worker.js';
import { usarFabrica } from '../../../apoio/fabrica.js';
import { diaRelativo, HOJE_TESTE, relogioFixo } from '../../../apoio/relogio.js';
import { entrarComo } from '../../../apoio/sessao.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);
const ANO = Number(HOJE_TESTE.slice(0, 4));
const corpo = { apelido: 'Toninho', anoNascimento: 1978, posicao: 'atacante', telefone: '(11) 98765-4321' };
const cliente = (cookie: string, data = HOJE_TESTE) => clienteTeste({ relogio: relogioFixo(data), cookie });
const url = (g: string) => `/api/grupos/${g}/jogadores`;
const campos = (r: { corpo: unknown }) => (r.corpo as { erro: { campos: Record<string, string> } }).erro.campos;

/** Cookie de sessão válida no instante do relógio de teste (a sessão expira por inatividade). */
async function cookieEm(db: Awaited<ReturnType<typeof abrir>>, contaId: string, data: string) {
  const agora = new Date(relogioFixo(data).agoraIso());
  return (await entrarComo(db, fabrica, contaId, { agora })).cookie;
}

describe('POST /api/grupos/:g/jogadores (workerd)', () => {
  it('sem dataEntrada o período abre hoje; com dataEntrada passada abre nela', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const r = await cliente(cen.adminA.cookie).post(url(g), corpo);
    expect(r.status).toBe(201);
    expect(jogadorDetalhe.parse(r.corpo)).toMatchObject({
      apelido: 'Toninho',
      telefone: '11987654321',
      semNota: true,
      nivel: 5.5,
      situacao: { ativo: true, desde: HOJE_TESTE },
    });
    const id = (r.corpo as { id: string }).id;
    const periodos = await kyselyDe(db)
      .selectFrom('periodos_ativos')
      .selectAll()
      .where('jogador_id', '=', id)
      .execute();
    expect(periodos).toHaveLength(1);
    expect(periodos[0]?.fim).toBeNull();

    const antes = diaRelativo(-30);
    const passada = await cliente(cen.adminA.cookie).post(url(g), {
      ...corpo,
      apelido: 'Entrou Antes',
      dataEntrada: antes,
    });
    expect(passada.status).toBe(201);
    expect(jogadorDetalhe.parse(passada.corpo).situacao).toMatchObject({ desde: antes });
  });

  it('pontuação inicial: padrão 0, aceita 0 e 9999 e volta no detalhe', async () => {
    const cen = await montarCenario(await abrir(), fabrica);
    const g = cen.grupoA.id;
    const semCampo = await cliente(cen.adminA.cookie).post(url(g), corpo);
    expect(jogadorDetalhe.parse(semCampo.corpo).pontuacaoInicial).toBe(0);
    for (const [i, valor] of [0, 9999].entries()) {
      const r = await cliente(cen.adminA.cookie).post(url(g), {
        ...corpo,
        apelido: `Inicial ${i}`,
        pontuacaoInicial: valor,
      });
      expect(r.status).toBe(201);
      expect(jogadorDetalhe.parse(r.corpo).pontuacaoInicial).toBe(valor);
    }
  });

  it('a mensagem do erro de pontuação inicial é a do contrato', async () => {
    const cen = await montarCenario(await abrir(), fabrica);
    const r = await cliente(cen.adminA.cookie).post(url(cen.grupoA.id), { ...corpo, pontuacaoInicial: 10000 });
    expect(campos(r)).toEqual({ pontuacaoInicial: 'Informe um número inteiro de 0 a 9999.' });
  });

  it('o ano máximo é o do hoje do servidor', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const fim = `${ANO}-12-31`;
    const virada = `${ANO + 1}-01-01`;
    const cookieFim = await cookieEm(db, cen.adminA.id, fim);
    const cookieVirada = await cookieEm(db, cen.adminA.id, virada);
    const com = (cookie: string, data: string, ano: number, apelido: string) =>
      cliente(cookie, data).post(url(g), { ...corpo, apelido, anoNascimento: ano });
    expect((await com(cookieFim, fim, ANO - 10, 'Limite')).status).toBe(201);
    const recusado = await com(cookieFim, fim, ANO - 9, 'Alem');
    expect(recusado.status).toBe(422);
    expect(Object.keys(campos(recusado))).toContain('anoNascimento');
    expect((await com(cookieVirada, virada, ANO - 9, 'Alem')).status).toBe(201);
  });

  it('apelido repetido sem caixa dá 422 no campo; em outro grupo é aceito', async () => {
    const cen = await montarCenario(await abrir(), fabrica);
    expect((await cliente(cen.adminA.cookie).post(url(cen.grupoA.id), corpo)).status).toBe(201);
    const repetido = await cliente(cen.adminA.cookie).post(url(cen.grupoA.id), { ...corpo, apelido: ' TONINHO ' });
    expect(repetido.status).toBe(422);
    expect(campos(repetido)).toEqual({ apelido: 'Já existe um jogador com esse apelido neste grupo.' });
    expect((await cliente(cen.adminB.cookie).post(url(cen.grupoB.id), corpo)).status).toBe(201);
  });

  it.each([
    ['apelido com 1 caractere', { apelido: 'A' }, 'apelido'],
    ['apelido com 31 caracteres', { apelido: 'a'.repeat(31) }, 'apelido'],
    ['ano 1939', { anoNascimento: 1939 }, 'anoNascimento'],
    ['entrada amanhã', { dataEntrada: diaRelativo(1) }, 'dataEntrada'],
    ['telefone inválido', { telefone: '123' }, 'telefone'],
    ['pontuação inicial negativa', { pontuacaoInicial: -1 }, 'pontuacaoInicial'],
    ['pontuação inicial acima de 9999', { pontuacaoInicial: 10000 }, 'pontuacaoInicial'],
    ['pontuação inicial decimal', { pontuacaoInicial: 1.5 }, 'pontuacaoInicial'],
    ['pontuação inicial em texto', { pontuacaoInicial: '12' }, 'pontuacaoInicial'],
    ['campo nivel extra', { nivel: 9 }, null],
    ['campo grupoId extra', { grupoId: '00000000-0000-4000-8000-000000000001' }, null],
  ])('422: %s', async (_nome, extra, campo) => {
    const cen = await montarCenario(await abrir(), fabrica);
    const r = await cliente(cen.adminA.cookie).post(url(cen.grupoA.id), { ...corpo, ...extra });
    expect(r.status).toBe(422);
    if (campo) expect(Object.keys(campos(r))).toContain(campo);
    expect(r.texto).not.toContain('123');
  });

  it('corpo vazio dá 422 e corpo acima de 16 KB é rejeitado', async () => {
    const cen = await montarCenario(await abrir(), fabrica);
    expect((await cliente(cen.adminA.cookie).post(url(cen.grupoA.id), {})).status).toBe(422);
    const grande = await cliente(cen.adminA.cookie).post(url(cen.grupoA.id), { ...corpo, apelido: 'x'.repeat(20_000) });
    expect([413, 422]).toContain(grande.status);
  });

  it('sem X-Pelada 403; sem sessão 401; admin de B em A 404 sem gravar', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const semCsrf = clienteTeste({ relogio: relogioFixo(HOJE_TESTE), cookie: cen.adminA.cookie, semCsrf: true });
    expect((await semCsrf.post(url(g), corpo)).status).toBe(403);
    expect((await clienteTeste({ relogio: relogioFixo(HOJE_TESTE) }).post(url(g), corpo)).status).toBe(401);
    expect((await cliente(cen.adminB.cookie).post(url(g), corpo)).status).toBe(404);
    const gravados = await kyselyDe(db).selectFrom('jogadores').select('id').where('grupo_id', '=', g).execute();
    expect(gravados).toHaveLength(0);
  });
});
