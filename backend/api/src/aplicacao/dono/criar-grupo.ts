import { grupoCriado, type AdminAdicionado, type GrupoCriado } from '@pelada/contrato';
import { HABILIDADES_INICIAIS, PESOS_PADRAO, gerarSlug, slugBase } from '@pelada/dominio';
import { emTransacao, type Db, type ExecutorDb } from '../../infraestrutura/db/index.js';
import * as auditoria from '../../infraestrutura/db/repositorios/auditoria.js';
import * as grupos from '../../infraestrutura/db/repositorios/grupos.js';
import { SlugEmUso } from '../../infraestrutura/db/repositorios/grupos.js';
import * as habilidades from '../../infraestrutura/db/repositorios/habilidades.js';
import * as pesos from '../../infraestrutura/db/repositorios/pesos.js';
import { vincularOuCriarAdmin } from '../acesso/admin-por-email.js';
import { urlPublicaDoGrupo } from './metadados-grupo.js';

export interface EntradaCriarGrupo {
  corpo: {
    nome: string;
    diaSemana: string;
    frequencia: string;
    horario: string;
    adminNome: string;
    adminEmail: string;
  };
  autorContaId: string;
  hoje: string;
  agora: Date;
  urlPublica: string;
}

export interface DependenciasCriarGrupo {
  vincularOuCriarAdmin: (
    tx: ExecutorDb,
    grupoId: string,
    admin: { nome: string; email: string; acessaFinanceiro: boolean },
    autor: { tipo: 'conta'; contaId: string },
    agora: Date,
  ) => Promise<AdminAdicionado>;
}

const TENTATIVAS = 3;

async function umaTentativa(tx: ExecutorDb, e: EntradaCriarGrupo, deps: DependenciasCriarGrupo): Promise<GrupoCriado> {
  const usados = await grupos.slugsComBase(tx, slugBase(e.corpo.nome));
  const slug = gerarSlug(e.corpo.nome, new Set(usados));
  const grupoId = await grupos.criar(tx, {
    nome: e.corpo.nome,
    slug,
    diaSemana: e.corpo.diaSemana,
    frequencia: e.corpo.frequencia,
    horario: e.corpo.horario,
    criadoPor: e.autorContaId,
    agora: e.agora,
  });
  await pesos.criarPadrao(tx, grupoId, {
    pesos: PESOS_PADRAO,
    vigenteDesde: e.hoje,
    registradoPor: e.autorContaId,
    agora: e.agora,
  });
  await habilidades.criarCatalogoInicial(tx, grupoId, HABILIDADES_INICIAIS);
  const autor = { tipo: 'conta', contaId: e.autorContaId } as const;
  const primeiroAdmin = await deps.vincularOuCriarAdmin(
    tx,
    grupoId,
    { nome: e.corpo.adminNome, email: e.corpo.adminEmail, acessaFinanceiro: true },
    autor,
    e.agora,
  );
  await auditoria.registrar(tx, grupoId, {
    autor,
    acao: 'grupo_criado',
    entidade: 'grupo',
    entidadeId: grupoId,
    resumo: { nome: e.corpo.nome, slug },
    agora: e.agora,
  });
  return grupoCriado.parse({
    grupo: { id: grupoId, nome: e.corpo.nome, slug, urlPublica: urlPublicaDoGrupo(e.urlPublica, slug) },
    primeiroAdmin,
  });
}

/**
 * Cria o grupo e o primeiro admin numa transação só: se qualquer passo falhar, nada fica. Se o slug
 * for disputado por outra criação ao mesmo tempo, repete a transação inteira (até 3 vezes).
 */
export async function criarGrupo(
  db: Db,
  entrada: EntradaCriarGrupo,
  deps: DependenciasCriarGrupo = { vincularOuCriarAdmin },
): Promise<GrupoCriado> {
  for (let tentativa = 1; ; tentativa++) {
    try {
      return await emTransacao(db, (tx) => umaTentativa(tx, entrada, deps));
    } catch (erro) {
      if (!(erro instanceof SlugEmUso) || tentativa >= TENTATIVAS) throw erro;
    }
  }
}
