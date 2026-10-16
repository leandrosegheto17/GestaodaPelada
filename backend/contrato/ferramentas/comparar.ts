/** Comparação de snapshots de JSON Schema para a regra de compatibilidade (G-20). Função pura. */
export type Direcao = 'entrada' | 'resposta';
export type EsquemaJson = { [chave: string]: unknown };

export interface Quebra {
  esquema: string;
  caminho: string;
  mudanca: string;
}

export interface QuebraAceita {
  esquema: string;
  caminho: string;
}

const ehObjeto = (valor: unknown): valor is EsquemaJson =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor);

const lista = (valor: unknown): unknown[] => (Array.isArray(valor) ? valor : []);

const tiposDe = (esquema: EsquemaJson): string[] => {
  const tipo = esquema['type'];
  return (Array.isArray(tipo) ? tipo : tipo === undefined ? [] : [tipo]).map(String).sort();
};

const nomeNormalizado = (nome: string): string => nome.toLowerCase().replace(/[_-]/g, '');

/** Propriedades `eDono` (qualquer grafia) em um schema de entrada, em qualquer profundidade. */
export function acharEDono(esquema: unknown, caminho = ''): string[] {
  if (Array.isArray(esquema)) return esquema.flatMap((item) => acharEDono(item, caminho));
  if (!ehObjeto(esquema)) return [];
  const achados: string[] = [];
  for (const [chave, valor] of Object.entries(esquema)) {
    if (chave === 'properties' && ehObjeto(valor)) {
      for (const [nome, filho] of Object.entries(valor)) {
        const destino = caminho ? `${caminho}.${nome}` : nome;
        if (nomeNormalizado(nome) === 'edono') achados.push(destino);
        achados.push(...acharEDono(filho, destino));
      }
    } else {
      achados.push(...acharEDono(valor, caminho));
    }
  }
  return achados;
}

function discriminador(ramo: unknown): string | null {
  if (!ehObjeto(ramo) || !ehObjeto(ramo['properties'])) return null;
  for (const [nome, filho] of Object.entries(ramo['properties'])) {
    if (ehObjeto(filho) && 'const' in filho) return `${nome}=${JSON.stringify(filho['const'])}`;
  }
  return null;
}

function ehNulo(ramo: unknown): boolean {
  return ehObjeto(ramo) && ramo['type'] === 'null';
}

function compararNo(
  antigo: unknown,
  novo: unknown,
  direcao: Direcao,
  caminho: string,
  saida: string[][],
): void {
  if (!ehObjeto(antigo) || !ehObjeto(novo)) return;
  const aqui = (mudanca: string, sub = caminho) => saida.push([sub, mudanca]);

  const tiposAntigos = tiposDe(antigo);
  const tiposNovos = tiposDe(novo);
  if (
    tiposAntigos.length > 0 &&
    tiposNovos.length > 0 &&
    tiposAntigos.join() !== tiposNovos.join()
  ) {
    aqui(`tipo trocado (${tiposAntigos.join('|')} → ${tiposNovos.join('|')})`);
  }

  for (const campo of ['enum', 'const'] as const) {
    if (campo === 'enum' && Array.isArray(antigo['enum'])) {
      const novos = lista(novo['enum']).map((v) => JSON.stringify(v));
      for (const valor of antigo['enum']) {
        if (!novos.includes(JSON.stringify(valor)))
          aqui(`valor de enum removido (${String(valor)})`);
      }
    }
    if (
      campo === 'const' &&
      'const' in antigo &&
      JSON.stringify(antigo['const']) !== JSON.stringify(novo['const'])
    ) {
      aqui('valor constante trocado');
    }
  }

  const propriedadesAntigas = ehObjeto(antigo['properties']) ? antigo['properties'] : {};
  const propriedadesNovas = ehObjeto(novo['properties']) ? novo['properties'] : {};
  const obrigatoriasAntigas = new Set(lista(antigo['required']).map(String));
  const obrigatoriasNovas = new Set(lista(novo['required']).map(String));
  const sub = (nome: string) => (caminho ? `${caminho}.${nome}` : nome);

  if (direcao === 'resposta') {
    for (const nome of Object.keys(propriedadesAntigas)) {
      if (!(nome in propriedadesNovas)) {
        aqui('campo removido', sub(nome));
        continue;
      }
      if (obrigatoriasAntigas.has(nome) && !obrigatoriasNovas.has(nome)) {
        aqui('campo obrigatório virou opcional', sub(nome));
      }
      compararNo(propriedadesAntigas[nome], propriedadesNovas[nome], direcao, sub(nome), saida);
    }
  } else {
    for (const nome of Object.keys(propriedadesNovas)) {
      if (!(nome in propriedadesAntigas)) {
        if (obrigatoriasNovas.has(nome)) aqui('campo de entrada novo e obrigatório', sub(nome));
        continue;
      }
      if (!obrigatoriasAntigas.has(nome) && obrigatoriasNovas.has(nome)) {
        aqui('campo de entrada opcional virou obrigatório', sub(nome));
      }
      compararNo(propriedadesAntigas[nome], propriedadesNovas[nome], direcao, sub(nome), saida);
    }
  }

  if (ehObjeto(antigo['items']) && ehObjeto(novo['items'])) {
    compararNo(antigo['items'], novo['items'], direcao, `${caminho}[]`, saida);
  }

  for (const uniao of ['anyOf', 'oneOf'] as const) {
    const ramosAntigos = lista(antigo[uniao]);
    const ramosNovos = lista(novo[uniao]);
    if (ramosAntigos.length === 0 && ramosNovos.length === 0) continue;
    ramosAntigos.forEach((ramo, indice) => {
      const chave = discriminador(ramo);
      const par =
        chave !== null
          ? ramosNovos.find((candidato) => discriminador(candidato) === chave)
          : ramosNovos[indice];
      if (par === undefined) {
        aqui(`ramo removido da união (${chave ?? indice})`, `${caminho}|${chave ?? indice}`);
        return;
      }
      compararNo(ramo, par, direcao, `${caminho}|${chave ?? indice}`, saida);
    });
    if (direcao === 'resposta' && ramosNovos.some(ehNulo) && !ramosAntigos.some(ehNulo)) {
      aqui('campo de resposta passou a aceitar nulo');
    }
  }
}

/** Lista as quebras de compatibilidade de um esquema; aceitas via `QUEBRAS.md` ficam de fora. */
export function compararEsquema(
  nome: string,
  direcao: Direcao,
  antigo: unknown,
  novo: unknown,
  aceitas: readonly QuebraAceita[] = [],
): Quebra[] {
  const bruto: string[][] = [];
  compararNo(antigo, novo, direcao, '', bruto);
  return bruto
    .map(([caminho, mudanca]) => ({
      esquema: nome,
      caminho: caminho ?? '',
      mudanca: mudanca ?? '',
    }))
    .filter((q) => !aceitas.some((a) => a.esquema === q.esquema && a.caminho === q.caminho));
}

/** Lê a tabela de `QUEBRAS.md`. Linha com esquema/caminho mas sem os dois deploys falha. */
export function lerQuebrasAceitas(markdown: string): QuebraAceita[] {
  const aceitas: QuebraAceita[] = [];
  for (const linha of markdown.split(/\r?\n/)) {
    if (!linha.trim().startsWith('|')) continue;
    const colunas = linha
      .trim()
      .replace(/^\||\|$/g, '')
      .split('|')
      .map((c) => c.trim());
    if (colunas.length !== 5) throw new Error(`QUEBRAS.md: linha malformada: ${linha.trim()}`);
    if (/^-+$/.test(colunas[0] ?? '') || colunas[0] === 'esquema') continue;
    const [esquema, caminho, mudanca, deploy1, deploy2] = colunas;
    if (!esquema || !mudanca || !deploy1 || !deploy2) {
      throw new Error(`QUEBRAS.md: a quebra precisa dos dois deploys: ${linha.trim()}`);
    }
    aceitas.push({ esquema, caminho: caminho ?? '' });
  }
  return aceitas;
}
