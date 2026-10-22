import { ErroApi } from './erros';

export type ErrosDeCampos = Record<string, string>;

/** Erros por campo do 422 da API (`campos`), ou `null` se o erro não for desse tipo. */
export function deErroApi(erro: unknown): ErrosDeCampos | null {
  if (!(erro instanceof ErroApi) || !erro.campos || Object.keys(erro.campos).length === 0) return null;
  return { ...erro.campos };
}

/** Mensagem pronta da API para um campo, ou `undefined` se o erro não for um 422 desse campo. */
export function mensagemDoCampo(erro: unknown, campo: string): string | undefined {
  return deErroApi(erro)?.[campo];
}

/** Resultado de `safeParse` de um schema do contrato (só o que precisamos dele). */
export type ResultadoValidacao =
  | { success: true }
  | { success: false; error: { issues: readonly { path: readonly PropertyKey[]; message: string }[] } };

/** Erros por campo a partir das issues do schema; vale a primeira mensagem de cada campo. */
export function deValidacao(resultado: ResultadoValidacao): ErrosDeCampos {
  const erros: ErrosDeCampos = {};
  if (resultado.success) return erros;
  for (const { path, message } of resultado.error.issues) {
    const campo = String(path[0] ?? '');
    if (campo && !(campo in erros)) erros[campo] = message;
  }
  return erros;
}
