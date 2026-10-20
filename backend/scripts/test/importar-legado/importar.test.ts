import { calcularRanking } from '@pelada/dominio';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as jogadores from '../../../api/src/infraestrutura/db/repositorios/jogadores.ts';
import * as partidas from '../../../api/src/infraestrutura/db/repositorios/partidas.ts';
import * as pesos from '../../../api/src/infraestrutura/db/repositorios/pesos.ts';
import { PESOS_LEGADO, VIGENCIA_LEGADO } from '../../importar-legado/calculo.ts';
import { importarLegado, prepararPlano, type OpcoesImportacao } from '../../importar-legado/executar.ts';
import { ErroLegado } from '../../importar-legado/tipos.ts';
import { criarBancoDescartavel, SLUG_DO_TESTE, type BancoDescartavel } from './banco.ts';
import { ATLETAS, HOJE_DAS_FIXTURES, montarCadastro, montarPontuacoes, pontosDeRodadas } from './fixtures.ts';

const TABELAS = [
  'jogadores',
  'periodos_ativos',
  'notas',
  'partidas',
  'presencas',
  'config_pesos',
  'auditoria',
] as const;

let banco: BancoDescartavel;
let saida: string[];

beforeEach(async () => {
  banco = await criarBancoDescartavel();
  saida = [];
}, 60_000);

afterEach(async () => {
  vi.restoreAllMocks();
  await banco.derrubar();
}, 60_000);

afterAll(() => vi.restoreAllMocks());

function opcoes(sobre: Partial<OpcoesImportacao> = {}): OpcoesImportacao {
  return {
    db: banco.db,
    slug: SLUG_DO_TESTE,
    textoPontuacoes: montarPontuacoes(),
    textoCadastro: montarCadastro(),
    dryRun: false,
    confirmoBackup: true,
    hoje: HOJE_DAS_FIXTURES,
    agora: new Date('2022-06-15T12:00:00Z'),
    confirmarGrupo: async (slug) => slug,
    escrever: (linha) => saida.push(linha),
    ...sobre,
  };
}

async function contagens(): Promise<Record<string, number>> {
  const lidas = await Promise.all(TABELAS.map((t) => banco.consultar<{ n: string }>(`SELECT count(*) AS n FROM ${t}`)));
  return Object.fromEntries(TABELAS.map((t, i) => [t, Number(lidas[i]?.[0]?.n)]));
}

describe('--dry-run', () => {
  it('não grava nada: as contagens de todas as tabelas ficam iguais', async () => {
    const antes = await contagens();
    const r = await importarLegado(opcoes({ dryRun: true }));
    expect(r.modo).toBe('dry-run');
    expect(await contagens()).toEqual(antes);
  });

  it('mostra contagens e, por jogador, calculado × "Atual"; a diferença igual ao ajuste vira "esperada"', async () => {
    await importarLegado(opcoes({ dryRun: true }));
    const texto = saida.join('\n');
    expect(texto).toContain('Jogadores: 7 (6 ativos, 1 inativos)');
    expect(texto).toContain('Partidas: 6 (1 com chuva)');
    expect(texto).toContain('Jogadores com lacuna no meio do histórico: 1');
    expect(texto).toContain('diferença esperada: Eco calculado 25 × Atual 28 (ajuste +3)');
    expect(texto).toContain('Dry-run concluído: nada foi gravado.');
  });

  it('usa a mesma leitura e o mesmo cálculo da execução real', async () => {
    const seco = await importarLegado(opcoes({ dryRun: true }));
    const real = await importarLegado(opcoes());
    expect(real.plano).toEqual(seco.plano);
    expect(real.plano).toEqual(prepararPlano(opcoes()));
  });

  it('diferença diferente do ajuste é erro e a execução real é impedida', async () => {
    const adulterado = montarPontuacoes().replace(
      '| Alfa | ativo | 30 |  | 0 | 21 | **51** |',
      '| Alfa | ativo | 30 |  | 0 | 21 | **52** |',
    );
    expect(adulterado).not.toEqual(montarPontuacoes());
    const antes = await contagens();
    await expect(importarLegado(opcoes({ dryRun: true, textoPontuacoes: adulterado }))).rejects.toThrow(/difere/);
    await expect(importarLegado(opcoes({ textoPontuacoes: adulterado }))).rejects.toThrow(/difere/);
    expect(saida.join('\n')).toContain('DIVERGÊNCIA: Alfa');
    expect(await contagens()).toEqual(antes);
  });

  it('informa as pré-condições sem recusar o dry-run', async () => {
    await importarLegado(opcoes());
    const r = await importarLegado(opcoes({ dryRun: true }));
    expect(r.modo === 'dry-run' && r.problemas.length).toBeGreaterThan(0);
  });
});

describe('execução real', () => {
  it('cria jogadores, períodos, notas dos ativos, partidas, presenças, pesos do legado e auditoria', async () => {
    const r = await importarLegado(opcoes());
    expect(r.modo).toBe('execucao');
    const c = await contagens();
    const presencas = r.plano.partidas.reduce((s, p) => s + p.presencas.length, 0);
    expect(c).toMatchObject({
      jogadores: 7,
      periodos_ativos: 7,
      notas: 36,
      partidas: 6,
      presencas,
      config_pesos: 1,
      auditoria: 1,
    });
    const fechados = await banco.consultar<{ n: string }>(
      'SELECT count(*) AS n FROM periodos_ativos WHERE fim IS NOT NULL',
    );
    expect(Number(fechados[0]?.n)).toBe(1);
  });

  it('a configuração do legado substitui as existentes do grupo (RN-24)', async () => {
    await importarLegado(opcoes());
    const configs = await banco.consultar<Record<string, unknown>>(
      `SELECT to_char(vigente_desde, 'YYYY-MM-DD') AS vigente_desde, presenca_sem_chuva, presenca_com_chuva,
              lesionado_sem_chuva, lesionado_com_chuva, expulso, expulso_com_chuva
         FROM config_pesos WHERE grupo_id = $1`,
      [banco.grupoId],
    );
    expect(configs).toEqual([
      {
        vigente_desde: VIGENCIA_LEGADO,
        presenca_sem_chuva: PESOS_LEGADO.presencaSemChuva,
        presenca_com_chuva: PESOS_LEGADO.presencaComChuva,
        lesionado_sem_chuva: PESOS_LEGADO.lesionadoSemChuva,
        lesionado_com_chuva: PESOS_LEGADO.lesionadoComChuva,
        expulso: PESOS_LEGADO.expulsoSemChuva,
        expulso_com_chuva: PESOS_LEGADO.expulsoComChuva,
      },
    ]);
  });

  it('grava só o ano de nascimento, telefone nulo, pontuação inicial, ano 1970 e posição Meia nos inativos', async () => {
    await importarLegado(opcoes());
    const linhas = await banco.consultar<{
      apelido: string;
      ano_nascimento: number;
      posicao: string;
      telefone: string | null;
      pontuacao_inicial: number;
    }>('SELECT apelido, ano_nascimento, posicao, telefone, pontuacao_inicial FROM jogadores ORDER BY apelido');
    expect(linhas.every((l) => l.telefone === null)).toBe(true);
    expect(linhas.find((l) => l.apelido === 'Alfa')).toMatchObject({
      ano_nascimento: 1980,
      posicao: 'meia',
      pontuacao_inicial: 30,
    });
    expect(linhas.find((l) => l.apelido === 'Foxtrot')).toMatchObject({
      ano_nascimento: 1970,
      posicao: 'meia',
      pontuacao_inicial: 5,
    });
    expect(linhas.find((l) => l.apelido === 'Charlie')?.posicao).toBe('lateral');
  });

  it('períodos: entrada na 1ª rodada com número; inativo sai no dia seguinte à última; nada além disso', async () => {
    await importarLegado(opcoes());
    const periodos = await banco.consultar<{ apelido: string; inicio: string; fim: string | null }>(
      `SELECT j.apelido, p.inicio::text AS inicio, p.fim::text AS fim FROM periodos_ativos p
         JOIN jogadores j ON j.id = p.jogador_id ORDER BY j.apelido`,
    );
    const de = (apelido: string) => periodos.filter((p) => p.apelido === apelido);
    expect(de('Alfa')).toEqual([{ apelido: 'Alfa', inicio: '2022-04-03', fim: null }]);
    expect(de('Charlie')).toHaveLength(1);
    expect(de('Delta')[0]?.inicio).toBe('2022-04-17');
    expect(de('Foxtrot')).toEqual([{ apelido: 'Foxtrot', inicio: '2022-04-03', fim: '2022-04-25' }]);
    expect(de('Golf')[0]?.inicio).toBe(HOJE_DAS_FIXTURES);
  });

  it('o total de cada ativo pelo ranking do app = pontuação inicial + soma das rodadas', async () => {
    await importarLegado(opcoes());
    const [lista, historico, configs] = await Promise.all([
      jogadores.listar(banco.db, banco.grupoId),
      partidas.historicoAte(banco.db, banco.grupoId, HOJE_DAS_FIXTURES),
      pesos.historico(banco.db, banco.grupoId),
    ]);
    const ranking = calcularRanking({
      hoje: HOJE_DAS_FIXTURES,
      mes: '2022-05',
      jogadores: lista.map((j) => ({
        id: j.id,
        apelido: j.apelido,
        anoNascimento: j.anoNascimento ?? 1970,
        periodos: j.periodos,
        pontuacaoInicial: j.pontuacaoInicial,
      })),
      partidas: historico.partidas,
      presencas: historico.presencas,
      configsPesos: configs.map((c) => ({ ...c, registradoEm: c.registradoEm.toISOString() })),
    });
    expect(ranking.linhas).toHaveLength(6);
    for (const atleta of ATLETAS.filter((a) => a.ativo)) {
      const linha = ranking.linhas.find((l) => l.apelido === atleta.apelido);
      expect(linha?.ptsFinal).toBe(atleta.inicial + pontosDeRodadas(atleta));
    }
  });

  it('a auditoria é da infraestrutura e o resumo só tem contagens', async () => {
    await importarLegado(opcoes());
    const [evento] = await banco.consultar<{
      acao: string;
      autor_tipo: string;
      autor_conta_id: string | null;
      resumo: Record<string, unknown>;
    }>('SELECT acao, autor_tipo, autor_conta_id, resumo FROM auditoria');
    expect(evento).toMatchObject({ acao: 'importacao_legado', autor_tipo: 'infraestrutura', autor_conta_id: null });
    expect(Object.values(evento?.resumo ?? {}).every((v) => typeof v === 'number')).toBe(true);
    const texto = JSON.stringify(evento);
    for (const a of ATLETAS) expect(texto).not.toContain(a.apelido);
  });
});

describe('recusas e rollback', () => {
  it('sem --confirmo-backup recusa e não grava', async () => {
    const antes = await contagens();
    await expect(importarLegado(opcoes({ confirmoBackup: false }))).rejects.toThrow(/backup/);
    expect(await contagens()).toEqual(antes);
  });

  it('confirmação digitada diferente do grupo recusa', async () => {
    const antes = await contagens();
    await expect(importarLegado(opcoes({ confirmarGrupo: async () => 'outro-grupo' }))).rejects.toThrow(/não confere/);
    expect(await contagens()).toEqual(antes);
  });

  it('grupo inexistente recusa', async () => {
    await expect(importarLegado(opcoes({ slug: 'nao-existe' }))).rejects.toThrow(ErroLegado);
  });

  it('a segunda execução é recusada e nada muda', async () => {
    await importarLegado(opcoes());
    const depois = await contagens();
    await expect(importarLegado(opcoes())).rejects.toThrow(ErroLegado);
    expect(await contagens()).toEqual(depois);
  });

  it('grupo que já tem partida é recusado, sem gravar jogador algum', async () => {
    await banco.consultar(
      `INSERT INTO partidas (grupo_id, data, criada_por, criada_em, alterada_por, alterada_em)
       VALUES ($1, '2022-03-01', $2, now(), $2, now())`,
      [banco.grupoId, banco.contaId],
    );
    const antes = await contagens();
    await expect(importarLegado(opcoes())).rejects.toThrow(/partidas/);
    expect(await contagens()).toEqual(antes);
  });

  it('apelido do arquivo que já existe no grupo é recusado, sem gravar', async () => {
    await banco.consultar(
      `INSERT INTO jogadores (grupo_id, apelido, ano_nascimento, posicao, criado_por, criado_em, alterado_por, alterado_em)
       VALUES ($1, 'ALFA', 1990, 'meia', $2, now(), $2, now())`,
      [banco.grupoId, banco.contaId],
    );
    const antes = await contagens();
    await expect(importarLegado(opcoes())).rejects.toThrow(/apelido/);
    expect(await contagens()).toEqual(antes);
  });

  it('erro injetado na 3ª partida desfaz tudo (transação única)', async () => {
    const criar = partidas.criar;
    let chamadas = 0;
    vi.spyOn(partidas, 'criar').mockImplementation((...args) => {
      if (++chamadas === 3) throw new Error('falha injetada');
      return criar(...args);
    });
    const antes = await contagens();
    await expect(importarLegado(opcoes())).rejects.toThrow('falha injetada');
    expect(chamadas).toBe(3);
    expect(await contagens()).toEqual(antes);
    const pesos = await banco.consultar<{ vigente_desde: string }>(`SELECT vigente_desde::text FROM config_pesos`);
    expect(pesos).toEqual([{ vigente_desde: '2026-01-01' }]);
  });

  it('arquivo inválido aborta antes de gravar', async () => {
    const antes = await contagens();
    const invalido = montarPontuacoes().replace('| Alfa | 3 | 3 | 6 | 3 | 15', '| Alfa | 3 | 4 | 6 | 3 | 15');
    await expect(importarLegado(opcoes({ textoPontuacoes: invalido }))).rejects.toThrow(/^Linha \d+: /);
    expect(await contagens()).toEqual(antes);
  });
});

describe('ordem de entrega', () => {
  it('recusa quando a etapa 1 (coluna pontuacao_inicial) não está no banco', async () => {
    await banco.derrubar();
    banco = await criarBancoDescartavel(['adequacao_legado']);
    const antes = await contagens().catch(() => null);
    await expect(importarLegado(opcoes())).rejects.toThrow(/etapa 1/);
    expect(await banco.consultar('SELECT 1 FROM jogadores')).toEqual([]);
    expect(antes === null || antes['jogadores'] === 0).toBe(true);
  });
});
