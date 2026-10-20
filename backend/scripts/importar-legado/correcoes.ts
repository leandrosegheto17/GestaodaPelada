import { ErroLegado } from './tipos.ts';

export const SITUACOES_DE_CORRECAO = ['presente', 'lesionado', 'expulso', 'ausente'] as const;
export type SituacaoDeCorrecao = (typeof SITUACOES_DE_CORRECAO)[number];

export interface CorrecaoDePresenca {
  data: string;
  atleta: string;
  situacao: SituacaoDeCorrecao;
}

/** Decisões do operador sobre o arquivo do legado; o arquivo fica fora do repositório. */
export interface Correcoes {
  /** Datas (`AAAA-MM-DD`) cuja partida teve chuva, mesmo com pontos simples no arquivo. */
  chuva: string[];
  presencas: CorrecaoDePresenca[];
}

export const SEM_CORRECOES: Readonly<Correcoes> = { chuva: [], presencas: [] };

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

const ehObjeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Data civil válida (recusa 2026-02-30). */
const dataValida = (v: unknown): v is string =>
  typeof v === 'string' && DATA_ISO.test(v) && new Date(`${v}T00:00:00Z`).toISOString().startsWith(v);

/**
 * Lê e valida o JSON de correções. As mensagens citam só a posição do item, nunca o conteúdo (pode haver apelido).
 */
export function lerCorrecoes(texto: string): Correcoes {
  let bruto: unknown;
  try {
    bruto = JSON.parse(texto);
  } catch {
    throw new ErroLegado('O arquivo de correções não é um JSON válido.');
  }
  if (!ehObjeto(bruto)) throw new ErroLegado('O arquivo de correções deve ser um objeto JSON.');
  const desconhecidas = Object.keys(bruto).filter((k) => k !== 'chuva' && k !== 'presencas');
  if (desconhecidas.length > 0) throw new ErroLegado('O arquivo de correções tem campo desconhecido.');

  const chuvaBruta = bruto['chuva'] ?? [];
  if (!Array.isArray(chuvaBruta)) throw new ErroLegado('"chuva" deve ser uma lista de datas.');
  const chuva = chuvaBruta.map((data, i): string => {
    if (!dataValida(data)) throw new ErroLegado(`Correção de chuva nº ${i + 1}: data inválida (use AAAA-MM-DD).`);
    return data;
  });
  if (new Set(chuva).size !== chuva.length) throw new ErroLegado('"chuva" tem data repetida.');

  const presencasBrutas = bruto['presencas'] ?? [];
  if (!Array.isArray(presencasBrutas)) throw new ErroLegado('"presencas" deve ser uma lista.');
  const presencas = presencasBrutas.map((item, i): CorrecaoDePresenca => {
    const n = i + 1;
    if (!ehObjeto(item)) throw new ErroLegado(`Correção de presença nº ${n}: deve ser um objeto.`);
    if (Object.keys(item).some((k) => k !== 'data' && k !== 'atleta' && k !== 'situacao')) {
      throw new ErroLegado(`Correção de presença nº ${n}: campo desconhecido.`);
    }
    const { data, atleta, situacao } = item;
    if (!dataValida(data)) throw new ErroLegado(`Correção de presença nº ${n}: data inválida (use AAAA-MM-DD).`);
    if (typeof atleta !== 'string' || atleta.trim() === '') {
      throw new ErroLegado(`Correção de presença nº ${n}: atleta deve ser um texto não vazio.`);
    }
    if (!SITUACOES_DE_CORRECAO.includes(situacao as SituacaoDeCorrecao)) {
      throw new ErroLegado(`Correção de presença nº ${n}: situação deve ser presente, lesionado, expulso ou ausente.`);
    }
    return { data, atleta, situacao: situacao as SituacaoDeCorrecao };
  });
  return { chuva, presencas };
}
