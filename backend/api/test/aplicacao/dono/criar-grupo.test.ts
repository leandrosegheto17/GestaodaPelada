import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { criarGrupo, type EntradaCriarGrupo } from '../../../src/aplicacao/dono/criar-grupo.js';
import { kyselyDe } from '../../../src/infraestrutura/db/cliente.js';
import * as grupos from '../../../src/infraestrutura/db/repositorios/grupos.js';
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

  it('falha no meio não deixa nada (grupo, pesos, habilidades)', async () => {
    const db = await abrir();
    const nome = `Falha ${unico()}`;
    const e = await entrada(db, nome);
    await expect(
      criarGrupo(db, e, {
        vincularOuCriarAdmin: () => {
          throw new Error('falha forçada');
        },
      }),
    ).rejects.toThrow('falha forçada');
    expect(await executarSql('SELECT 1 FROM grupos WHERE nome = $1', [nome])).toEqual([]);
    expect(await executarSql('SELECT 1 FROM contas WHERE email = $1', [e.corpo.adminEmail])).toEqual([]);
  });
});
