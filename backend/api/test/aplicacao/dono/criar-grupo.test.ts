import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  criarGrupo,
  type DependenciasCriarGrupo,
  type EntradaCriarGrupo,
} from '../../../src/aplicacao/dono/criar-grupo.js';
import { kyselyDe } from '../../../src/infraestrutura/db/cliente.js';
import * as grupos from '../../../src/infraestrutura/db/repositorios/grupos.js';
import { SlugEmUso } from '../../../src/infraestrutura/db/repositorios/grupos.js';
import * as pesos from '../../../src/infraestrutura/db/repositorios/pesos.js';
import { usarDb } from '../../apoio/db-teste.js';
import { criarConta } from '../../apoio/fabricas/contas.js';
import { usarFabrica } from '../../apoio/fabrica.js';
import { executarSql } from '../../apoio/sql.js';

const fabrica = usarFabrica();
const abrir = usarDb(fabrica);
const AGORA = new Date('2026-10-16T12:00:00Z');
const unico = () => randomBytes(4).toString('hex');

async function entrada(db: Awaited<ReturnType<typeof abrir>>, nome: string): Promise<EntradaCriarGrupo> {
  const dono = await criarConta(db, fabrica);
  return {
    corpo: {
      nome,
      diaSemana: 'sabado',
      frequencia: 'semanal',
      horario: '10:00',
      adminNome: 'Rodrigo',
      adminEmail: `rodrigo-${unico()}@teste.invalid`,
    },
    autorContaId: dono.id,
    hoje: '2026-10-16',
    agora: AGORA,
    urlPublica: 'http://localhost:8787',
  };
}

function limparCriado(db: Awaited<ReturnType<typeof abrir>>, grupoId: string, contaId: string) {
  fabrica.registrar(async () => {
    const banco = kyselyDe(db);
    for (const tabela of ['config_pesos', 'habilidades', 'auditoria', 'vinculos_admin'] as const) {
      await banco.deleteFrom(tabela).where('grupo_id', '=', grupoId).execute();
    }
    await banco.deleteFrom('grupos').where('id', '=', grupoId).execute();
    await banco.deleteFrom('auditoria').where('entidade_id', '=', contaId).execute();
    await banco.deleteFrom('contas').where('id', '=', contaId).execute();
  });
}

describe('criarGrupo', () => {
  it('cria slug, pesos padrão, 6 habilidades e o primeiro admin com financeiro', async () => {
    const db = await abrir();
    const nome = `Racha ${unico()}`;
    const e = await entrada(db, nome);
    const r = await criarGrupo(db, e);
    limparCriado(db, r.grupo.id, r.primeiroAdmin.contaId);
    expect(r.grupo.slug).toMatch(/^racha-/);
    expect(r.grupo.urlPublica).toBe(`http://localhost:8787/g/${r.grupo.slug}`);
    expect(r.primeiroAdmin).toMatchObject({ contaNova: true, nome: 'Rodrigo' });
    expect(r.primeiroAdmin.senhaTemporaria).toHaveLength(12);
    const g = await grupos.buscarPorId(db, r.grupo.id);
    expect(g?.situacaoComercial).toBe('uso_proprio');
    const linhas = await executarSql<{ expulso: number; presenca_com_chuva: number }>(
      'SELECT expulso, presenca_com_chuva FROM config_pesos WHERE grupo_id = $1',
      [r.grupo.id],
    );
    expect(linhas).toEqual([{ expulso: -1, presenca_com_chuva: 1 }]);
    expect(await executarSql('SELECT 1 FROM habilidades WHERE grupo_id = $1', [r.grupo.id])).toHaveLength(6);
    const vinculo = await executarSql<{ acessa_financeiro: boolean }>(
      'SELECT acessa_financeiro FROM vinculos_admin WHERE grupo_id = $1',
      [r.grupo.id],
    );
    expect(vinculo).toEqual([{ acessa_financeiro: true }]);
    const auditoria = await executarSql<{ resumo: object }>(
      "SELECT resumo FROM auditoria WHERE acao = 'grupo_criado' AND grupo_id = $1",
      [r.grupo.id],
    );
    expect(JSON.stringify(auditoria[0]?.resumo)).not.toContain(r.primeiroAdmin.senhaTemporaria as string);
  });

  it('colisão de slug ganha sufixo', async () => {
    const db = await abrir();
    const nome = `Mesmo Nome ${unico()}`;
    const primeiro = await criarGrupo(db, await entrada(db, nome));
    limparCriado(db, primeiro.grupo.id, primeiro.primeiroAdmin.contaId);
    const segundo = await criarGrupo(db, await entrada(db, nome));
    limparCriado(db, segundo.grupo.id, segundo.primeiroAdmin.contaId);
    expect(segundo.grupo.slug).toBe(`${primeiro.grupo.slug}-2`);
  });

  it('terceiro grupo com o mesmo nome ganha -3, inclusive se o anterior está arquivado', async () => {
    const db = await abrir();
    const nome = `Trio ${unico()}`;
    const primeiro = await criarGrupo(db, await entrada(db, nome));
    limparCriado(db, primeiro.grupo.id, primeiro.primeiroAdmin.contaId);
    const segundo = await criarGrupo(db, await entrada(db, nome));
    limparCriado(db, segundo.grupo.id, segundo.primeiroAdmin.contaId);
    await executarSql('UPDATE grupos SET arquivado_em = $2 WHERE id = $1', [segundo.grupo.id, AGORA]);
    const terceiro = await criarGrupo(db, await entrada(db, nome));
    limparCriado(db, terceiro.grupo.id, terceiro.primeiroAdmin.contaId);
    expect(segundo.grupo.slug).toBe(`${primeiro.grupo.slug}-2`);
    expect(terceiro.grupo.slug).toBe(`${primeiro.grupo.slug}-3`);
  });

  it('corrida: SlugEmUso na 1ª tentativa e sucesso na 2ª; 3 falhas seguidas propagam o erro', async () => {
    const db = await abrir();
    const e = await entrada(db, `Corrida ${unico()}`);
    let chamadas = 0;
    const r = await criarGrupo(db, e, {
      criarPesosPadrao: async (tx, grupoId, dados) => {
        chamadas++;
        if (chamadas === 1) throw new SlugEmUso();
        await pesos.criarPadrao(tx, grupoId, dados);
      },
    });
    limparCriado(db, r.grupo.id, r.primeiroAdmin.contaId);
    expect(chamadas).toBe(2);
    expect(await executarSql('SELECT 1 FROM grupos WHERE nome = $1', [e.corpo.nome])).toHaveLength(1);

    const falha = await entrada(db, `Corrida Falha ${unico()}`);
    let tentativas = 0;
    await expect(
      criarGrupo(db, falha, {
        criarPesosPadrao: async () => {
          tentativas++;
          throw new SlugEmUso();
        },
      }),
    ).rejects.toBeInstanceOf(SlugEmUso);
    expect(tentativas).toBe(3);
    expect(await executarSql('SELECT 1 FROM grupos WHERE nome = $1', [falha.corpo.nome])).toEqual([]);
  });

  async function contagens(e: EntradaCriarGrupo) {
    const [c] = await executarSql<{ grupos: number; contas: number; vinculos: number; auditoria: number }>(
      `SELECT
         (SELECT count(*)::int FROM grupos WHERE nome = $1) AS grupos,
         (SELECT count(*)::int FROM contas WHERE email = $2) AS contas,
         (SELECT count(*)::int FROM vinculos_admin v JOIN grupos g ON g.id = v.grupo_id WHERE g.nome = $1) AS vinculos,
         (SELECT count(*)::int FROM auditoria a WHERE a.grupo_id IN (SELECT id FROM grupos WHERE nome = $1)
            OR a.entidade_id IN (SELECT id FROM contas WHERE email = $2)) AS auditoria`,
      [e.corpo.nome, e.corpo.adminEmail],
    );
    return c;
  }

  const FALHAS: Array<[string, keyof DependenciasCriarGrupo]> = [
    ['pesos', 'criarPesosPadrao'],
    ['habilidades', 'criarCatalogoInicial'],
    ['admin', 'vincularOuCriarAdmin'],
  ];
  it.each(FALHAS)('falha em %s não deixa resíduo (grupos, contas, vínculos, auditoria)', async (_nome, dep) => {
    const db = await abrir();
    const e = await entrada(db, `Falha ${unico()}`);
    const antes = await contagens(e);
    await expect(
      criarGrupo(db, e, {
        [dep]: () => {
          throw new Error('falha forçada');
        },
      }),
    ).rejects.toThrow('falha forçada');
    expect(await contagens(e)).toEqual(antes);
    expect(antes).toEqual({ grupos: 0, contas: 0, vinculos: 0, auditoria: 0 });
  });

  it('e-mail de conta existente: vincula, hash da senha inalterado, sem senha temporária', async () => {
    const db = await abrir();
    const existente = await criarConta(db, fabrica);
    const e = await entrada(db, `Vinculo ${unico()}`);
    e.corpo.adminEmail = existente.email;
    const hashAntes = await executarSql<{ senha_hash: string | null }>('SELECT senha_hash FROM contas WHERE id = $1', [
      existente.id,
    ]);
    const r = await criarGrupo(db, e);
    fabrica.registrar(async () => {
      const banco = kyselyDe(db);
      for (const tabela of ['config_pesos', 'habilidades', 'auditoria', 'vinculos_admin'] as const) {
        await banco.deleteFrom(tabela).where('grupo_id', '=', r.grupo.id).execute();
      }
      await banco.deleteFrom('grupos').where('id', '=', r.grupo.id).execute();
    });
    expect(r.primeiroAdmin).toMatchObject({ contaId: existente.id, contaNova: false, senhaTemporaria: null });
    const hashDepois = await executarSql('SELECT senha_hash FROM contas WHERE id = $1', [existente.id]);
    expect(hashDepois).toEqual(hashAntes);
  });

  it('pesos 1,1,1,1,-1 vigentes desde hoje; conta nova com troca de senha obrigatória', async () => {
    const db = await abrir();
    const e = await entrada(db, `Pesos ${unico()}`);
    const r = await criarGrupo(db, e);
    limparCriado(db, r.grupo.id, r.primeiroAdmin.contaId);
    const pesosGravados = await executarSql<Record<string, number | string>>(
      `SELECT presenca_sem_chuva, presenca_com_chuva, lesionado_sem_chuva, lesionado_com_chuva, expulso,
              to_char(vigente_desde, 'YYYY-MM-DD') AS vigente_desde
         FROM config_pesos WHERE grupo_id = $1`,
      [r.grupo.id],
    );
    expect(pesosGravados).toEqual([
      {
        presenca_sem_chuva: 1,
        presenca_com_chuva: 1,
        lesionado_sem_chuva: 1,
        lesionado_com_chuva: 1,
        expulso: -1,
        vigente_desde: e.hoje,
      },
    ]);
    const conta = await executarSql<{ senha_temporaria: boolean }>('SELECT senha_temporaria FROM contas WHERE id = $1', [
      r.primeiroAdmin.contaId,
    ]);
    expect(conta).toEqual([{ senha_temporaria: true }]);
  });
});
