import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { sessaoEu, type SessaoEu } from '@pelada/contrato';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { recursos } from '../../config/recursos';
import { decidirGrupo, destinoDoGrupo } from './decidirGrupo';

vi.mock('../../config/recursos', () => ({ recursos: { ligado: vi.fn(() => true) } }));

const RESPOSTAS = join(import.meta.dirname, '../../../../../.md/mockup/respostas');
const sessao = (arquivo: string): SessaoEu =>
  sessaoEu.parse(JSON.parse(readFileSync(join(RESPOSTAS, arquivo), 'utf8')));

const admin = sessao('sessao-eu-admin.json');
const semGrupos = sessao('sessao-eu-sem-grupos.json');
const umGrupo: SessaoEu = { ...admin, grupos: admin.grupos.slice(0, 1) };

beforeEach(() => vi.mocked(recursos.ligado).mockReturnValue(true));

const nenhum = { grupo: null, area: null };

describe('decidirGrupo', () => {
  it('dois grupos sem link: lista sem aviso', () => {
    expect(decidirGrupo(admin, nenhum)).toEqual({ tipo: 'lista', grupoSemAcesso: null });
  });

  it('link de um grupo da pessoa: vai direto à tela de início dele', () => {
    expect(decidirGrupo(admin, { grupo: 'pelada-de-quinta', area: null })).toEqual({
      tipo: 'redirecionar',
      para: '/admin/g-quinta',
    });
  });

  it('link de um grupo que não é dela: lista com aviso', () => {
    expect(decidirGrupo(admin, { grupo: 'futebol-da-firma', area: null })).toEqual({
      tipo: 'lista',
      grupoSemAcesso: 'futebol-da-firma',
    });
  });

  it.each(['../x', '%2F%2Fevil', 'a'.repeat(65), 'MAIÚSCULA', ''])('link malformado %j é ignorado', (grupo) => {
    expect(decidirGrupo(admin, { grupo, area: null })).toEqual({ tipo: 'lista', grupoSemAcesso: null });
  });

  it('um só grupo: redireciona; nenhum: vazio', () => {
    expect(decidirGrupo(umGrupo, nenhum)).toEqual({ tipo: 'redirecionar', para: '/admin/g-quinta' });
    expect(decidirGrupo(semGrupos, nenhum)).toEqual({ tipo: 'vazio' });
  });
});

describe('destinoDoGrupo', () => {
  const comFinanceiro = { ...admin.grupos[0]!, acessaFinanceiro: true };
  const semFinanceiro = { ...admin.grupos[0]!, acessaFinanceiro: false };

  it('sem área: tela de início', () => {
    expect(destinoDoGrupo(comFinanceiro)).toBe('/admin/g-quinta');
  });

  it('área financeira: com permissão vai ao financeiro, sem permissão volta com aviso', () => {
    expect(destinoDoGrupo(comFinanceiro, 'financeiro')).toBe('/admin/g-quinta/financeiro');
    expect(destinoDoGrupo(semFinanceiro, 'financeiro')).toBe('/admin/g-quinta?negado=financeiro');
  });

  it('com o recurso financeiro desligado, a área é ignorada', () => {
    vi.mocked(recursos.ligado).mockReturnValue(false);
    expect(destinoDoGrupo(semFinanceiro, 'financeiro')).toBe('/admin/g-quinta');
  });
});
