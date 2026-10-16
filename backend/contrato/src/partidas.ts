import { z } from 'zod';
import { situacaoPresenca } from './enums.js';
import { estenderErro } from './erro.js';
import { data, idResposta, mes, uuid } from './primitivos.js';
import type { Esquemas } from './registro-tipos.js';

export const linhaPresenca = z.strictObject({
  id: idResposta,
  apelido: z.string(),
  situacao: situacaoPresenca,
});

const contagem = z.number().int().min(0);

export const partidasDoMes = z.strictObject({
  mes,
  hoje: data,
  navegacao: z.strictObject({ mesAnterior: mes.nullable(), mesSeguinte: mes.nullable() }),
  partidas: z.array(
    z.strictObject({
      data,
      choveu: z.boolean(),
      contagem: z.strictObject({ presentes: contagem, lesionados: contagem, expulsos: contagem }),
    }),
  ),
});

export type PartidasDoMes = z.infer<typeof partidasDoMes>;

export const partidaNova = z.strictObject({
  data,
  dataSugerida: data,
  hoje: data,
  jaExiste: z.boolean(),
  preMarcadaPelaEscalacao: z.boolean(),
  choveu: z.boolean(),
  jogadores: z.array(linhaPresenca),
});

export type PartidaNova = z.infer<typeof partidaNova>;

export const partidaDetalhe = z.strictObject({
  data,
  hoje: data,
  choveu: z.boolean(),
  alteradaPor: z.string(),
  alteradaEm: z.iso.datetime(),
  jogadores: z.array(linhaPresenca),
});

export type PartidaDetalhe = z.infer<typeof partidaDetalhe>;

export const partidasMesQuery = z.strictObject({ mes });
export const partidaNovaQuery = z.strictObject({ data: data.optional() });

const marcacao = z.strictObject({ jogadorId: uuid, situacao: situacaoPresenca });

const marcacoesSemRepeticao = z
  .array(marcacao)
  .refine(
    (lista) => new Set(lista.map((m) => m.jogadorId)).size === lista.length,
    'Há jogador repetido nas marcações.',
  );

/** Corpo estático (registro e snapshot). A regra "data ≤ hoje" vem da fábrica abaixo. */
export const salvarPartidaCorpoBase = z.strictObject({
  data,
  choveu: z.boolean(),
  marcacoes: marcacoesSemRepeticao,
});

export function salvarPartidaCorpo(hoje: string) {
  return z.strictObject({
    data: data.refine((d) => d <= hoje, 'A data não pode ser no futuro.'),
    choveu: z.boolean(),
    marcacoes: marcacoesSemRepeticao,
  });
}

export const erroPartidaDuplicada = estenderErro({
  codigo: z.literal('partida_ja_existe'),
  dataExistente: data,
});

export const esquemasPartidas: Esquemas = {
  'partidas.mes': { direcao: 'resposta', schema: partidasDoMes },
  'partidas.mes.consulta': { direcao: 'entrada', schema: partidasMesQuery },
  'partidas.nova': { direcao: 'resposta', schema: partidaNova },
  'partidas.nova.consulta': { direcao: 'entrada', schema: partidaNovaQuery },
  'partidas.detalhe': { direcao: 'resposta', schema: partidaDetalhe },
  'partidas.salvar.corpo': { direcao: 'entrada', schema: salvarPartidaCorpoBase },
  'partidas.erro.duplicada': { direcao: 'resposta', schema: erroPartidaDuplicada },
};
