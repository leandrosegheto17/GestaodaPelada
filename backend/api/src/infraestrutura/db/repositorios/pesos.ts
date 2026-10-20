import { sql } from 'kysely';
import { kyselyDe, type ExecutorDb, type Tx } from '../cliente.js';

export class VigenciaNoPassado extends Error {
  constructor() {
    super('A vigência não pode ser anterior a hoje.');
  }
}

export interface Pesos {
  presencaSemChuva: number;
  presencaComChuva: number;
  lesionadoSemChuva: number;
  lesionadoComChuva: number;
  expulsoSemChuva: number;
  expulsoComChuva: number;
}

export interface ConfigPesos extends Pesos {
  vigenteDesde: string;
  /** Nome de quem registrou (sem e-mail). */
  registradoPor: string;
  registradoEm: Date;
}

export interface ConfigPesosHistorico extends ConfigPesos {
  /** Último dia de vigência; nulo na configuração vigente. */
  vigenteAte: string | null;
}

interface LinhaPesos {
  vigente_desde: string;
  vigente_ate?: string | null;
  registrado_por: string;
  registrado_em: Date;
  presenca_sem_chuva: number;
  presenca_com_chuva: number;
  lesionado_sem_chuva: number;
  lesionado_com_chuva: number;
  expulso: number;
  expulso_com_chuva: number;
}

const paraConfig = (l: LinhaPesos): ConfigPesos => ({
  vigenteDesde: l.vigente_desde,
  registradoPor: l.registrado_por,
  registradoEm: l.registrado_em,
  presencaSemChuva: l.presenca_sem_chuva,
  presencaComChuva: l.presenca_com_chuva,
  lesionadoSemChuva: l.lesionado_sem_chuva,
  lesionadoComChuva: l.lesionado_com_chuva,
  expulsoSemChuva: l.expulso,
  expulsoComChuva: l.expulso_com_chuva,
});

/** Configuração em vigor na data (maior `vigente_desde` ≤ data); `null` antes da primeira. */
export async function vigenteEm(ex: ExecutorDb, grupoId: string, data: string): Promise<ConfigPesos | null> {
  const r = await sql<LinhaPesos>`
    SELECT c.vigente_desde::text AS vigente_desde, a.nome AS registrado_por, c.registrado_em,
           c.presenca_sem_chuva, c.presenca_com_chuva, c.lesionado_sem_chuva, c.lesionado_com_chuva, c.expulso,
           c.expulso_com_chuva
    FROM config_pesos c JOIN contas a ON a.id = c.registrado_por
    WHERE c.grupo_id = ${grupoId} AND c.vigente_desde <= ${data}::date
    ORDER BY c.vigente_desde DESC LIMIT 1
  `.execute(kyselyDe(ex));
  const linha = r.rows[0];
  return linha ? paraConfig(linha) : null;
}

/** Todas as configurações, da mais recente para a mais antiga, numa consulta. */
export async function historico(ex: ExecutorDb, grupoId: string): Promise<ConfigPesosHistorico[]> {
  const r = await sql<LinhaPesos>`
    SELECT c.vigente_desde::text AS vigente_desde,
           (lead(c.vigente_desde) OVER (ORDER BY c.vigente_desde) - 1)::text AS vigente_ate,
           a.nome AS registrado_por, c.registrado_em,
           c.presenca_sem_chuva, c.presenca_com_chuva, c.lesionado_sem_chuva, c.lesionado_com_chuva, c.expulso,
           c.expulso_com_chuva
    FROM config_pesos c JOIN contas a ON a.id = c.registrado_por
    WHERE c.grupo_id = ${grupoId}
    ORDER BY c.vigente_desde DESC
  `.execute(kyselyDe(ex));
  return r.rows.map((l) => ({ ...paraConfig(l), vigenteAte: l.vigente_ate ?? null }));
}

export interface NovaConfigPesos {
  pesos: Pesos;
  vigenteDesde: string;
  /** "Hoje" de São Paulo, vindo do relógio da API. */
  hoje: string;
  registradoPor: string;
  agora: Date;
}

async function gravar(ex: ExecutorDb, grupoId: string, c: NovaConfigPesos): Promise<boolean> {
  const r = await sql<{ substituiu: boolean }>`
    INSERT INTO config_pesos (grupo_id, vigente_desde, presenca_sem_chuva, presenca_com_chuva, lesionado_sem_chuva,
                              lesionado_com_chuva, expulso, expulso_com_chuva, registrado_por, registrado_em)
    VALUES (${grupoId}, ${c.vigenteDesde}::date, ${c.pesos.presencaSemChuva}, ${c.pesos.presencaComChuva},
            ${c.pesos.lesionadoSemChuva}, ${c.pesos.lesionadoComChuva}, ${c.pesos.expulsoSemChuva}, ${c.pesos.expulsoComChuva}, ${c.registradoPor}, ${c.agora})
    ON CONFLICT (grupo_id, vigente_desde) DO UPDATE SET
      presenca_sem_chuva = EXCLUDED.presenca_sem_chuva, presenca_com_chuva = EXCLUDED.presenca_com_chuva,
      lesionado_sem_chuva = EXCLUDED.lesionado_sem_chuva, lesionado_com_chuva = EXCLUDED.lesionado_com_chuva,
      expulso = EXCLUDED.expulso, expulso_com_chuva = EXCLUDED.expulso_com_chuva, registrado_por = EXCLUDED.registrado_por, registrado_em = EXCLUDED.registrado_em
    RETURNING (xmax <> 0) AS substituiu
  `.execute(kyselyDe(ex));
  return r.rows[0]?.substituiu ?? false;
}

/**
 * Nova configuração a partir de `vigenteDesde` (nunca no passado). Na mesma data a anterior é
 * substituída; configurações de datas anteriores nunca mudam.
 */
export async function criar(ex: ExecutorDb, grupoId: string, nova: NovaConfigPesos): Promise<{ substituiu: boolean }> {
  if (nova.vigenteDesde < nova.hoje) throw new VigenciaNoPassado();
  return { substituiu: await gravar(ex, grupoId, nova) };
}

/** Pesos com que o grupo nasce (valores vindos do domínio), com vigência na data de criação. */
export async function criarPadrao(
  ex: ExecutorDb,
  grupoId: string,
  padrao: { pesos: Pesos; vigenteDesde: string; registradoPor: string; agora: Date },
): Promise<void> {
  await gravar(ex, grupoId, { ...padrao, hoje: padrao.vigenteDesde });
}

/**
 * Troca todas as configurações do grupo por uma só, com a vigência dada (inclusive no passado).
 * Existe para a importação do legado, que traz o histórico inteiro de uma vez; nenhuma rota a usa.
 */
export async function substituirTodas(
  ex: Tx,
  grupoId: string,
  config: { pesos: Pesos; vigenteDesde: string; registradoPor: string; agora: Date },
): Promise<{ removidas: number }> {
  const apagadas = await kyselyDe(ex).deleteFrom('config_pesos').where('grupo_id', '=', grupoId).executeTakeFirst();
  await gravar(ex, grupoId, { ...config, hoje: config.vigenteDesde });
  return { removidas: Number(apagadas.numDeletedRows) };
}
