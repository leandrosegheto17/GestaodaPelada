import { describe, expect, it } from 'vitest';
import {
  adicionarAdminCorpo,
  adminAdicionado,
  editarGrupoCorpo,
  erroPadrao,
  financeiroAdminCorpo,
  grupoDetalhe,
  listaAdmins,
  senhaExibida,
} from '../src/index.js';
import { respostas } from './apoio/respostas.js';

const campos = (nome: RegExp): string[] =>
  Object.keys(
    (respostas(nome)[0]?.json as { erro: { campos: Record<string, string> } }).erro.campos,
  );

describe('respostas do mockup', () => {
  it.each(respostas(/^grupo-(quinta|domingo)(-.*)?\.json$/))(
    '$nome passa em grupoDetalhe',
    ({ json }) => {
      expect(grupoDetalhe.safeParse(json).success).toBe(true);
    },
  );
  it.each(respostas(/^admins-.*\.json$/))('$nome passa em listaAdmins', ({ json }) => {
    expect(listaAdmins.safeParse(json).success).toBe(true);
  });
  it.each(respostas(/^admin-(criado|vinculado)\.json$/))(
    '$nome passa em adminAdicionado',
    ({ json }) => {
      expect(adminAdicionado.safeParse(json).success).toBe(true);
    },
  );
  it('senha-redefinida.json', () => {
    expect(senhaExibida.safeParse(respostas(/^senha-redefinida\.json$/)[0]?.json).success).toBe(
      true,
    );
  });
  it('erros de validação são erros padrão com chaves do corpo', () => {
    for (const nome of respostas(/^erro-validacao-(grupo|admin)\.json$/)) {
      expect(erroPadrao.safeParse(nome.json).success).toBe(true);
    }
    expect(campos(/^erro-validacao-grupo\.json$/)).toEqual(['nome']);
    expect(campos(/^erro-validacao-admin\.json$/)).toEqual(['email']);
  });
});

describe('editarGrupoCorpo', () => {
  const ok = {
    nome: 'Pelada de Quinta',
    diaSemana: 'quinta',
    frequencia: 'semanal',
    horario: '20:00',
  };
  it.each([
    [2, false],
    [3, true],
    [60, true],
    [61, false],
  ])('nome com %i caracteres → %s', (n, aceito) => {
    expect(editarGrupoCorpo.safeParse({ ...ok, nome: 'a'.repeat(n) }).success).toBe(aceito);
  });
  it.each(['24:00', '9:00', ''])('horário %j é recusado', (horario) => {
    expect(editarGrupoCorpo.safeParse({ ...ok, horario }).success).toBe(false);
  });
  it('23:59 passa; dia e frequência fora do enum, slug e urlPublica são recusados', () => {
    expect(editarGrupoCorpo.safeParse({ ...ok, horario: '23:59' }).success).toBe(true);
    expect(editarGrupoCorpo.safeParse({ ...ok, diaSemana: 'feriado' }).success).toBe(false);
    expect(editarGrupoCorpo.safeParse({ ...ok, frequencia: 'diaria' }).success).toBe(false);
    expect(editarGrupoCorpo.safeParse({ ...ok, slug: 'x' }).success).toBe(false);
    expect(editarGrupoCorpo.safeParse({ ...ok, urlPublica: 'https://x.com' }).success).toBe(false);
  });
});

describe('inicio opcional e dinheiro', () => {
  const base = respostas(/^grupo-quinta\.json$/)[0]?.json as { inicio: Record<string, unknown> };
  const sem = (...chaves: string[]) => ({
    ...base,
    inicio: Object.fromEntries(Object.entries(base.inicio).filter(([k]) => !chaves.includes(k))),
  });
  it('aceita sem escalacaoConfirmadaPara e sem saldoAtualCentavos', () => {
    expect(
      grupoDetalhe.safeParse(sem('escalacaoConfirmadaPara', 'saldoAtualCentavos')).success,
    ).toBe(true);
  });
  it('saldo decimal é recusado (G-07)', () => {
    expect(
      grupoDetalhe.safeParse({ ...base, inicio: { ...base.inicio, saldoAtualCentavos: 10.5 } })
        .success,
    ).toBe(false);
  });
});

describe('admins', () => {
  it.each([
    [1, false],
    [2, true],
    [60, true],
    [61, false],
  ])('nome do admin com %i caracteres → %s', (n, aceito) => {
    expect(adicionarAdminCorpo.safeParse({ nome: 'a'.repeat(n), email: 'a@b.com' }).success).toBe(
      aceito,
    );
  });
  it('e-mail inválido e de 255 caracteres são recusados', () => {
    expect(adicionarAdminCorpo.safeParse({ nome: 'Ana', email: 'x' }).success).toBe(false);
    expect(
      adicionarAdminCorpo.safeParse({ nome: 'Ana', email: `${'a'.repeat(250)}@b.com` }).success,
    ).toBe(false);
  });
  it('contaNova e senhaTemporaria precisam concordar', () => {
    const conta = { contaId: 'c-1', nome: 'Ana' };
    expect(
      adminAdicionado.safeParse({ ...conta, contaNova: true, senhaTemporaria: null }).success,
    ).toBe(false);
    expect(
      adminAdicionado.safeParse({ ...conta, contaNova: false, senhaTemporaria: 'abc' }).success,
    ).toBe(false);
  });
  it('financeiro só aceita o booleano', () => {
    expect(financeiroAdminCorpo.safeParse({ acessaFinanceiro: true }).success).toBe(true);
    expect(financeiroAdminCorpo.safeParse({ acessaFinanceiro: true, eDono: true }).success).toBe(
      false,
    );
  });
  it('nenhum schema de leitura tem campo de senha', () => {
    const lista = JSON.stringify(respostas(/^admins-.*\.json$/).map((r) => r.json));
    expect(lista).not.toMatch(/senha|hash/i);
  });
});
