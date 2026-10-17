import { HABILIDADES_INICIAIS, PESOS_PADRAO, diaDaSemana, somarDias, type DiaDaSemana } from '@pelada/dominio';
import { criarDb, emTransacao, fecharDb, type Tx } from '../api/src/infraestrutura/db/index.ts';
import * as contas from '../api/src/infraestrutura/db/repositorios/contas.ts';
import * as grupos from '../api/src/infraestrutura/db/repositorios/grupos.ts';
import * as habilidades from '../api/src/infraestrutura/db/repositorios/habilidades.ts';
import * as jogadores from '../api/src/infraestrutura/db/repositorios/jogadores.ts';
import * as partidas from '../api/src/infraestrutura/db/repositorios/partidas.ts';
import * as pesos from '../api/src/infraestrutura/db/repositorios/pesos.ts';
import { apagarDadosDoSeed } from '../api/src/infraestrutura/db/repositorios/seed-local.ts';
import * as vinculos from '../api/src/infraestrutura/db/repositorios/vinculos.ts';
import { exigirHostPermitido, HostRecusado } from '../api/src/infraestrutura/seguranca/trava-host.ts';
import {
  JOGADORES_DOMINGO,
  JOGADORES_QUINTA,
  NOTAS_DO_TONINHO,
  notasEmTornoDe,
  type JogadorDoSeed,
} from './seed-local/dados.ts';
import {
  EMAILS_DO_SEED,
  EMAIL_CARLOS,
  EMAIL_DONO,
  EMAIL_MARQUINHOS,
  EMAIL_PAULO,
  EMAIL_RODRIGO,
  SENHA_DE_TESTE,
  SENHA_TEMPORARIA_DE_TESTE,
  SLUGS_DO_SEED,
  SLUG_DOMINGO,
  SLUG_QUINTA,
} from './seed-local/ids.ts';

/**
 * Dados fictícios para o ambiente local: 2 grupos, 5 contas, jogadores com notas e 3 meses de
 * partidas, nas datas fixas do mockup (até `HOJE_DO_SEED`). Idempotente: apaga e recria só o que é do seed.
 * Só roda em host local (a trava recusa qualquer outro, mesmo com --alvo).
 */
const DIA_QUINTA: DiaDaSemana = 4;
const DIA_DOMINGO: DiaDaSemana = 0;

/** "Hoje" do mockup: o seed é determinístico e igual aos dados de resposta do mockup. */
const HOJE_DO_SEED = '2026-10-22';
const MOMENTO_DO_SEED = new Date('2026-10-22T15:00:00Z');

/** Datas de jogo do dia da semana nos últimos ~3 meses até `hoje` (inclusive), da mais antiga à mais nova. */
function datasDeJogo(hoje: string, dia: DiaDaSemana, passoSemanas: number): string[] {
  const datas: string[] = [];
  let data = hoje;
  while (diaDaSemana(data) !== dia) data = somarDias(data, -1);
  for (let i = 0; i < 13; i += passoSemanas) datas.push(somarDias(data, -7 * i));
  return datas.reverse();
}

/** Sorteio determinístico (sem Math.random): mesma entrada, mesmo resultado. */
function sorteio(a: number, b: number): number {
  return ((a * 7919 + b * 104729 + 13) * 2654435761) % 100;
}

function situacaoDe(partida: number, jogador: number): 'presente' | 'lesionado' | 'expulso' | null {
  const n = sorteio(partida, jogador);
  if (n < 20) return null;
  if (n < 24) return 'lesionado';
  if (n < 26) return 'expulso';
  return 'presente';
}

async function criarJogadores(
  tx: Tx,
  grupoId: string,
  lista: readonly JogadorDoSeed[],
  autor: string,
  entrada: string,
  agora: Date,
  catalogo: { id: string; nome: string }[],
): Promise<string[]> {
  const ids: string[] = [];
  for (const [i, j] of lista.entries()) {
    const id = await jogadores.criar(tx, grupoId, {
      apelido: j.apelido,
      anoNascimento: j.anoNascimento,
      posicao: j.posicao,
      telefone: null,
      dataEntrada: entrada,
      autor,
      agora,
    });
    ids.push(id);
    const notas = j.apelido === 'Toninho' ? NOTAS_DO_TONINHO : j.nivel === null ? [] : notasEmTornoDe(j.nivel, i);
    for (const [k, nota] of notas.entries()) {
      const habilidade = catalogo[k];
      if (habilidade) await habilidades.gravarNota(tx, grupoId, id, habilidade.id, nota);
    }
  }
  return ids;
}

async function criarPartidas(
  tx: Tx,
  grupoId: string,
  datas: string[],
  jogadorIds: string[],
  autor: string,
  agora: Date,
): Promise<number> {
  let presencas = 0;
  for (const [p, data] of datas.entries()) {
    const marcadas = jogadorIds.flatMap((jogadorId, j) => {
      const situacao = situacaoDe(p, j);
      return situacao ? [{ jogadorId, situacao }] : [];
    });
    presencas += marcadas.length;
    await partidas.criar(tx, grupoId, { data, choveu: p % 4 === 1, presencas: marcadas, autor, agora });
  }
  return presencas;
}

async function semear(tx: Tx, hoje: string, agora: Date): Promise<Record<string, number>> {
  await apagarDadosDoSeed(tx, { slugs: SLUGS_DO_SEED, emails: EMAILS_DO_SEED });

  const dono = await contas.criarContaDono(tx, { email: EMAIL_DONO, nome: 'Leandro', senha: SENHA_DE_TESTE, agora });
  await contas.trocarSenha(tx, dono, SENHA_DE_TESTE, { temporaria: false });
  await contas.marcarAvisoVisto(tx, dono, agora);
  const novaConta = (email: string, nome: string, temporaria = false) =>
    contas.criar(tx, {
      email,
      nome,
      senha: temporaria ? SENHA_TEMPORARIA_DE_TESTE : SENHA_DE_TESTE,
      senhaTemporaria: temporaria,
      agora,
    });
  const marquinhos = await novaConta(EMAIL_MARQUINHOS, 'Marquinhos');
  const carlos = await novaConta(EMAIL_CARLOS, 'Carlos');
  await novaConta(EMAIL_RODRIGO, 'Rodrigo', true);
  const paulo = await novaConta(EMAIL_PAULO, 'Paulo');
  await contas.marcarAvisoVisto(tx, carlos, agora);
  await contas.marcarAvisoVisto(tx, paulo, agora);

  const criarGrupoDoSeed = async (nome: string, slug: string, dia: string, frequencia: string, horario: string) => {
    const id = await grupos.criar(tx, { nome, slug, diaSemana: dia, frequencia, horario, criadoPor: dono, agora });
    await pesos.criarPadrao(tx, id, {
      pesos: PESOS_PADRAO,
      vigenteDesde: somarDias(hoje, -120),
      registradoPor: dono,
      agora,
    });
    await pesos.criar(tx, id, {
      pesos: { ...PESOS_PADRAO, presencaComChuva: 2 },
      vigenteDesde: hoje,
      hoje,
      registradoPor: dono,
      agora,
    });
    await habilidades.criarCatalogoInicial(tx, id, HABILIDADES_INICIAIS);
    return { id, catalogo: await habilidades.listar(tx, id) };
  };
  const quinta = await criarGrupoDoSeed('Pelada de Quinta', SLUG_QUINTA, 'quinta', 'semanal', '20:00');
  const domingo = await criarGrupoDoSeed('Racha de Domingo', SLUG_DOMINGO, 'domingo', 'quinzenal', '09:00');

  const vincular = (grupoId: string, contaId: string, financeiro: boolean) =>
    vinculos.criar(tx, grupoId, { contaId, acessaFinanceiro: financeiro, criadoPor: dono, agora });
  await vincular(quinta.id, dono, true);
  await vincular(quinta.id, marquinhos, false);
  await vincular(domingo.id, dono, false);
  await vincular(domingo.id, carlos, true);

  const entrada = somarDias(hoje, -110);
  const idsQuinta = await criarJogadores(tx, quinta.id, JOGADORES_QUINTA, dono, entrada, agora, quinta.catalogo);
  const idsDomingo = await criarJogadores(tx, domingo.id, JOGADORES_DOMINGO, dono, entrada, agora, domingo.catalogo);
  const datasQuinta = datasDeJogo(hoje, DIA_QUINTA, 1).filter((d) => d < hoje || d === hoje);
  const datasDomingo = datasDeJogo(hoje, DIA_DOMINGO, 2);
  const presencas = await criarPartidas(tx, quinta.id, datasQuinta, idsQuinta, dono, agora);
  await criarPartidas(tx, domingo.id, datasDomingo, idsDomingo, dono, agora);

  return {
    contas: 5,
    grupos: 2,
    jogadores: JOGADORES_QUINTA.length + JOGADORES_DOMINGO.length,
    partidasQuinta: datasQuinta.length,
    partidasDomingo: datasDomingo.length,
    presencasQuinta: presencas,
  };
}

async function principal(): Promise<void> {
  const url = process.env['DATABASE_URL'];
  await exigirHostPermitido({ url });
  const promessas: Promise<unknown>[] = [];
  const db = criarDb({ connectionString: url as string }, { waitUntil: (p) => void promessas.push(p) });
  try {
    const resumo = await emTransacao(db, (tx) => semear(tx, HOJE_DO_SEED, MOMENTO_DO_SEED));
    console.log('Seed local concluído:', JSON.stringify(resumo));
    console.log(`Contas de teste (senha ${SENHA_DE_TESTE}): ${EMAILS_DO_SEED.join(', ')}`);
    console.log(`Rodrigo tem senha temporária: ${SENHA_TEMPORARIA_DE_TESTE}`);
  } finally {
    await fecharDb(db);
    await Promise.all(promessas);
  }
}

principal().catch((erro: unknown) => {
  console.error(erro instanceof HostRecusado ? erro.message : 'Falha ao semear o banco local.');
  process.exit(1);
});
