import { z } from 'zod';
import { adminAdicionado, nomeAdmin } from './admins.js';
import { diaSemana, frequencia, situacaoComercial } from './enums.js';
import { dadosGrupo } from './grupo.js';
import { LIMITES } from './limites.js';
import { data, email, horario, idResposta, slug } from './primitivos.js';
import type { Esquemas } from './registro-tipos.js';

/**
 * O dono só vê metadados (RF-07): nenhum schema deste arquivo tem jogador, partida, nota
 * ou financeiro, e todos são `strict`.
 */
export const grupoMetadados = z.strictObject({
  id: idResposta,
  nome: z.string(),
  diaSemana,
  frequencia,
  horario,
  situacaoComercial,
  inicioTrial: data.nullable(),
  admins: z.array(z.string()),
  criadoEm: data,
  arquivadoEm: data.nullable(),
});

export const pedidoReset = z.strictObject({
  contaId: idResposta,
  email: z.string(),
  grupos: z.array(z.string()),
  ultimoPedidoEm: z.iso.datetime(),
});

export const painelDono = z.strictObject({
  pedidosReset: z.array(pedidoReset),
  grupos: z.array(grupoMetadados),
  dono: z.strictObject({ tambemAdmin: z.boolean() }),
});
export type PainelDono = z.infer<typeof painelDono>;

export const grupoDono = z.strictObject({
  id: idResposta,
  nome: z.string(),
  slug,
  urlPublica: z.url(),
  diaSemana,
  frequencia,
  horario,
  situacaoComercial,
  inicioTrial: data.nullable(),
  criadoEm: data,
  arquivadoEm: data.nullable(),
  admins: z.array(z.strictObject({ contaId: idResposta, nome: z.string(), email: z.string() })),
});
export type GrupoDono = z.infer<typeof grupoDono>;

export const grupoCriado = z.strictObject({
  grupo: z.strictObject({ id: idResposta, nome: z.string(), slug, urlPublica: z.url() }),
  primeiroAdmin: adminAdicionado,
});

/** Criar grupo: os dados do grupo mais o primeiro admin (conta nova ou vínculo por e-mail). */
export const criarGrupoCorpo = dadosGrupo.extend({ adminNome: nomeAdmin, adminEmail: email });

/** `trial` exige a data de início; as demais situações exigem `null` (RN-16). */
export const situacaoComercialCorpo = z
  .strictObject({ situacaoComercial, inicioTrial: data.nullable() })
  .superRefine((corpo, contexto) => {
    const trial = corpo.situacaoComercial === 'trial';
    if (trial && corpo.inicioTrial === null) {
      contexto.addIssue({
        code: 'custom',
        path: ['inicioTrial'],
        message: 'Informe o início do trial.',
      });
    }
    if (!trial && corpo.inicioTrial !== null) {
      contexto.addIssue({
        code: 'custom',
        path: ['inicioTrial'],
        message: 'Só o trial tem data de início.',
      });
    }
  });

/** A igualdade exata com o nome do grupo é conferida na rota. */
export const arquivarGrupoCorpo = z.strictObject({
  nomeConfirmacao: z.string().min(1, 'Digite o nome do grupo.').max(LIMITES.nomeGrupo.max),
});

export const esquemasDono: Esquemas = {
  'dono.painel': { direcao: 'resposta', schema: painelDono },
  'dono.grupo': { direcao: 'resposta', schema: grupoDono },
  'dono.grupo-criado': { direcao: 'resposta', schema: grupoCriado },
  'dono.criar-grupo.corpo': { direcao: 'entrada', schema: criarGrupoCorpo },
  'dono.situacao.corpo': { direcao: 'entrada', schema: situacaoComercialCorpo },
  'dono.arquivar.corpo': { direcao: 'entrada', schema: arquivarGrupoCorpo },
};
