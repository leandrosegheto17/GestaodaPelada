import { describe, expect, it } from 'vitest';
import {
  REGISTRO,
  arquivarGrupoCorpo,
  criarGrupoCorpo,
  erroPadrao,
  grupoCriado,
  grupoDono,
  painelDono,
  situacaoComercialCorpo,
} from '../src/index.js';
import { respostas } from './apoio/respostas.js';

describe('respostas do mockup', () => {
  it.each(respostas(/^dono-painel.*\.json$/))('$nome passa em painelDono', ({ json }) => {
    expect(painelDono.safeParse(json).success).toBe(true);
  });
  it.each(respostas(/^dono-grupo-(quinta|firma-arquivado)\.json$/))(
    '$nome passa em grupoDono',
    ({ json }) => {
      expect(grupoDono.safeParse(json).success).toBe(true);
    },
  );
  it.each(respostas(/^dono-grupo-criado-.*\.json$/))('$nome passa em grupoCriado', ({ json }) => {
    expect(grupoCriado.safeParse(json).success).toBe(true);
  });
  it('erro de validação do novo grupo usa chaves do corpo', () => {
    const { json } = respostas(/^erro-validacao-novo-grupo\.json$/)[0] ?? { json: null };
    expect(erroPadrao.safeParse(json).success).toBe(true);
    const chaves = Object.keys((json as { erro: { campos: object } }).erro.campos);
    expect(chaves.every((c) => c in criarGrupoCorpo.shape)).toBe(true);
  });
});

const PROIBIDOS = [
  'jogadores',
  'partidas',
  'presencas',
  'notas',
  'nivel',
  'habilidades',
  'financeiro',
  'pagamentos',
  'lancamentos',
  'telefone',
  'anoNascimento',
];

function nomesDePropriedades(no: unknown, saida: string[] = []): string[] {
  if (Array.isArray(no)) no.forEach((n) => nomesDePropriedades(n, saida));
  else if (no && typeof no === 'object') {
    for (const [chave, valor] of Object.entries(no)) {
      if (chave === 'properties' && valor && typeof valor === 'object') {
        saida.push(...Object.keys(valor));
      }
      nomesDePropriedades(valor, saida);
    }
  }
  return saida;
}

describe('RF-07: o dono só vê metadados', () => {
  it('nenhum schema do dono tem propriedade de jogador, partida, nota ou financeiro', async () => {
    const { z } = await import('zod');
    for (const [nome, { direcao, schema }] of Object.entries(REGISTRO)) {
      if (!nome.startsWith('dono.')) continue;
      const json = z.toJSONSchema(schema, {
        io: direcao === 'entrada' ? 'input' : 'output',
        unrepresentable: 'any',
      });
      const nomes = nomesDePropriedades(json);
      for (const proibido of PROIBIDOS)
        expect(nomes, `${nome}: ${proibido}`).not.toContain(proibido);
      expect(
        nomes.filter((n) => n.startsWith('saldo')),
        nome,
      ).toEqual([]);
    }
  });
  it('jogadores inseridos no grupo ou no painel são recusados (strict)', () => {
    const painel = respostas(/^dono-painel\.json$/)[0]?.json as { grupos: object[] };
    const grupo = respostas(/^dono-grupo-quinta\.json$/)[0]?.json as object;
    expect(grupoDono.safeParse({ ...grupo, jogadores: [] }).success).toBe(false);
    expect(
      painelDono.safeParse({
        ...painel,
        grupos: [{ ...(painel.grupos[0] as object), jogadores: [] }],
      }).success,
    ).toBe(false);
  });
});

describe('criarGrupoCorpo', () => {
  const ok = {
    nome: 'Racha de Sábado',
    diaSemana: 'sabado',
    frequencia: 'semanal',
    horario: '10:00',
    adminNome: 'Rodrigo',
    adminEmail: 'rodrigo@exemplo.com.br',
  };
  it('aceita o corpo válido', () => {
    expect(criarGrupoCorpo.safeParse(ok).success).toBe(true);
  });
  it.each([
    { nome: 'ab' },
    { nome: 'a'.repeat(61) },
    { adminEmail: 'x' },
    { adminNome: 'a' },
    { adminNome: 'a'.repeat(61) },
    { slug: 'meu-slug' },
    { eDono: true },
    { id: 'g-1' },
  ])('recusa %j', (alteracao) => {
    expect(criarGrupoCorpo.safeParse({ ...ok, ...alteracao }).success).toBe(false);
  });
});

describe('situacaoComercialCorpo e arquivar', () => {
  it.each([
    [{ situacaoComercial: 'trial', inicioTrial: null }, false],
    [{ situacaoComercial: 'trial', inicioTrial: '2026-10-22' }, true],
    [{ situacaoComercial: 'ativo', inicioTrial: '2026-10-22' }, false],
    [{ situacaoComercial: 'ativo', inicioTrial: null }, true],
    [{ situacaoComercial: 'gratis', inicioTrial: null }, false],
  ])('%j → %s', (corpo, aceito) => {
    expect(situacaoComercialCorpo.safeParse(corpo).success).toBe(aceito);
  });
  it('nomeConfirmacao não pode ser vazio', () => {
    expect(arquivarGrupoCorpo.safeParse({ nomeConfirmacao: '' }).success).toBe(false);
    expect(arquivarGrupoCorpo.safeParse({ nomeConfirmacao: 'Futebol da Firma' }).success).toBe(
      true,
    );
  });
});
