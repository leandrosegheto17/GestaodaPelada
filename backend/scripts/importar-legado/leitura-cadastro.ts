import { LIMITES, POSICOES, type Posicao } from '@pelada/contrato';
import { apelidoDoArquivo } from './apelido.ts';
import { celulaDe, colunaDe, dividirLinhas, inteiroDe, normalizar, tabelasDaSecao } from './tabela-md.ts';
import { ErroLegado, type AtivoLido, type CadastroLido } from './tipos.ts';

/** Nomes do legado (e das posições antigas do app) para a posição do app. */
const POSICAO_POR_NOME: Record<string, Posicao> = {
  zagueiro: 'zagueiro',
  defensor: 'zagueiro',
  lateral: 'lateral',
  volante: 'volante',
  meia: 'meia',
  'meio-campo': 'meia',
  'meio campo': 'meia',
  meio_campo: 'meia',
  atacante: 'atacante',
  centroavante: 'centroavante',
  goleiro: 'goleiro',
};

export function posicaoDoLegado(texto: string): Posicao | null {
  const posicao = POSICAO_POR_NOME[normalizar(texto)];
  return posicao && POSICOES.includes(posicao) ? posicao : null;
}

/** Ano de um `dd/mm/aaaa` real; a data completa não sai desta função. */
function anoDoNascimento(texto: string, linha: number, hoje: string): number {
  const achado = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto.trim());
  if (!achado) throw new ErroLegado('data de nascimento inválida.', linha);
  const [dia, mes, ano] = [Number(achado[1]), Number(achado[2]), Number(achado[3])];
  const real = new Date(Date.UTC(ano, mes - 1, dia));
  if (real.getUTCMonth() !== mes - 1 || real.getUTCDate() !== dia)
    throw new ErroLegado('data de nascimento inexistente.', linha);
  if (ano < LIMITES.anoNascimentoMin || ano > Number(hoje.slice(0, 4)) - LIMITES.idadeMinima) {
    throw new ErroLegado('ano de nascimento fora do permitido.', linha);
  }
  return ano;
}

function lerDados(tabelas: ReturnType<typeof tabelasDaSecao>, hoje: string) {
  const tabela = tabelas[0];
  if (!tabela) throw new ErroLegado('seção "Ativos — dados" não encontrada.');
  const quantas = tabela.cabecalho.celulas.length;
  // O telefone existe no arquivo, mas nenhuma coluna dele é lida.
  const iApelido = colunaDe(tabela, 'Atleta', (c) => c === 'atleta');
  const iNascimento = colunaDe(tabela, 'Nascimento', (c) => c === 'nascimento');
  const iPosicoes = colunaDe(tabela, 'Posições preferidas', (c) => c.startsWith('posicoes'));
  return tabela.linhas.map((l) => {
    const apelido = apelidoDoArquivo(celulaDe(l, iApelido, quantas), l.numero);
    const primeira = celulaDe(l, iPosicoes, quantas).split(',')[0] ?? '';
    const posicao = posicaoDoLegado(primeira);
    if (!posicao) throw new ErroLegado('posição preferida desconhecida ou ausente.', l.numero);
    return {
      apelido,
      linha: l.numero,
      anoNascimento: anoDoNascimento(celulaDe(l, iNascimento, quantas), l.numero, hoje),
      posicao,
    };
  });
}

function lerHabilidades(tabelas: ReturnType<typeof tabelasDaSecao>) {
  const tabela = tabelas[0];
  if (!tabela) throw new ErroLegado('seção "Ativos — habilidades" não encontrada.');
  const quantas = tabela.cabecalho.celulas.length;
  const iApelido = colunaDe(tabela, 'Atleta', (c) => c === 'atleta');
  const colunas = ['visao', 'passe', 'fisico', 'drible', 'chute', 'desarme'].map((nome) =>
    colunaDe(tabela, nome, (c) => c.startsWith(nome)),
  );
  return new Map(
    tabela.linhas.map((l) => {
      const apelido = apelidoDoArquivo(celulaDe(l, iApelido, quantas), l.numero);
      const notas = colunas.map((i) => {
        const nota = inteiroDe(celulaDe(l, i, quantas));
        if (nota === null || nota < LIMITES.nota.min || nota > LIMITES.nota.max) {
          throw new ErroLegado(`nota fora de ${LIMITES.nota.min} a ${LIMITES.nota.max}.`, l.numero);
        }
        return nota;
      });
      return [normalizar(apelido), notas] as const;
    }),
  );
}

function lerInativos(tabelas: ReturnType<typeof tabelasDaSecao>): string[] {
  const tabela = tabelas[0];
  if (!tabela) throw new ErroLegado('seção "Inativos" não encontrada.');
  const quantas = tabela.cabecalho.celulas.length;
  const iApelido = colunaDe(tabela, 'Atleta', (c) => c === 'atleta');
  return tabela.linhas.map((l) => apelidoDoArquivo(celulaDe(l, iApelido, quantas), l.numero));
}

/**
 * Lê `Cadastro.md`: posição principal e ano de nascimento (só o ano) dos ativos, as seis notas deles e
 * os apelidos dos inativos. A coluna de telefone nunca é lida.
 */
export function lerCadastro(texto: string, hoje: string): CadastroLido {
  const linhas = dividirLinhas(texto);
  const dados = lerDados(
    tabelasDaSecao(linhas, (t) => t.startsWith('ativos') && t.includes('dados')),
    hoje,
  );
  const notas = lerHabilidades(tabelasDaSecao(linhas, (t) => t.startsWith('ativos') && t.includes('habilidades')));
  const ativos = dados.map((d): AtivoLido => {
    const doJogador = notas.get(normalizar(d.apelido));
    if (!doJogador) throw new ErroLegado('ativo sem notas de habilidades.', d.linha);
    return { apelido: d.apelido, anoNascimento: d.anoNascimento, posicao: d.posicao, notas: doJogador };
  });
  return { ativos, inativos: lerInativos(tabelasDaSecao(linhas, (t) => t === 'inativos')) };
}
