import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { grupoDetalhe, type GrupoDetalhe } from '@pelada/contrato';
import { describe, expect, it } from 'vitest';
import { secoesDoGrupo } from './metasSecoes';

const RESPOSTAS = join(import.meta.dirname, '../../../../../.md/mockup/respostas');
const quinta: GrupoDetalhe = grupoDetalhe.parse(JSON.parse(readFileSync(join(RESPOSTAS, 'grupo-quinta.json'), 'utf8')));

const com = (inicio: Partial<GrupoDetalhe['inicio']>): GrupoDetalhe => ({
  ...quinta,
  inicio: { ...quinta.inicio, ...inicio },
});
const metas = (detalhe: GrupoDetalhe, comFinanceiro = true) =>
  Object.fromEntries(secoesDoGrupo({ detalhe, comFinanceiro }).map((s) => [s.id, s.meta]));

describe('secoesDoGrupo', () => {
  it('singular e plural', () => {
    const m = metas(com({ partidasNoMes: 1, jogadoresAtivos: 1, habilidades: 1, admins: 1, aparelhosNaSemana: 1 }));
    expect(m).toMatchObject({
      partidas: '1 em outubro',
      jogadores: '1 ativo',
      habilidades: '1 habilidade',
      admins: '1 admin',
      uso: 'Esta semana: 1 aparelho',
    });
  });

  it('zeros', () => {
    const m = metas(com({ partidasNoMes: 0, jogadoresAtivos: 0, habilidades: 0, aparelhosNaSemana: 0 }));
    expect(m).toMatchObject({
      partidas: 'Nenhuma em outubro',
      jogadores: 'Nenhum cadastrado',
      habilidades: 'Nenhuma habilidade',
      uso: 'Sem uso registrado',
    });
  });

  it('pontuação: pesos padrão ou vigência', () => {
    expect(metas(com({ pesosPadrao: true })).pontuacao).toBe('Pesos padrão');
    expect(metas(quinta).pontuacao).toBe('Vigente desde 01/09/2026');
  });

  it('financeiro: saldo, caixa não configurado e ausência sem permissão', () => {
    expect(metas(quinta).financeiro).toBe('Saldo R$ 1.245,50');
    expect(metas(com({ saldoAtualCentavos: null })).financeiro).toBe('Caixa não configurado');
    expect(metas(quinta, false)).not.toHaveProperty('financeiro');
  });

  it('saldo negativo usa o sinal de menos', () => {
    expect(metas(com({ saldoAtualCentavos: -10000 })).financeiro).toBe('Saldo − R$ 100,00');
  });
});
