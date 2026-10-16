import { sessaoEu, type SessaoEu } from '@pelada/contrato';
import type { Config } from '../../config/index.js';
import type { ExecutorDb } from '../../infraestrutura/db/index.js';
import * as vinculos from '../../infraestrutura/db/repositorios/vinculos.js';
import type { SessaoAtual } from './sessao.js';

/**
 * Resposta de `GET /api/sessao/eu`. Com escopo `troca_de_senha` os grupos vêm vazios: a tela
 * só pede a troca, e nada de grupo é exposto antes dela.
 */
export async function montarSessaoEu(db: ExecutorDb, sessao: SessaoAtual, config: Config): Promise<SessaoEu> {
  const grupos = sessao.escopo === 'completo' ? await vinculos.gruposDaConta(db, sessao.conta.id) : [];
  return sessaoEu.parse({
    conta: {
      id: sessao.conta.id,
      nome: sessao.conta.nome,
      email: sessao.conta.email,
      eDono: sessao.conta.eDono,
    },
    escopo: sessao.escopo,
    avisoPrivacidadeVisto: sessao.conta.avisoPrivacidadeVistoEm !== null,
    enderecoNovo: config.enderecoNovo,
    grupos: grupos.map((g) => ({
      id: g.grupoId,
      nome: g.nome,
      slug: g.slug,
      diaSemana: g.diaSemana,
      frequencia: g.frequencia,
      horario: g.horario,
      acessaFinanceiro: g.acessaFinanceiro,
    })),
  });
}
