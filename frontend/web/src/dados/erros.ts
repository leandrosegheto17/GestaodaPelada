import type { ErroPadrao } from '@pelada/contrato';

/** Erro devolvido pela API na forma padrão `{ erro: { codigo, mensagem, campos? } }`. */
export class ErroApi extends Error {
  readonly status: number;
  readonly codigo: string;
  readonly campos: Record<string, string> | undefined;
  readonly extras: Record<string, unknown>;

  constructor(status: number, corpo: ErroPadrao) {
    super(corpo.erro.mensagem);
    this.name = 'ErroApi';
    this.status = status;
    const { codigo, campos, ...extras } = corpo.erro;
    this.codigo = codigo;
    this.campos = campos;
    this.extras = extras;
  }
}

/** A requisição não chegou à API (rede fora, DNS, conexão interrompida). */
export class ErroRede extends Error {
  constructor(causa: unknown) {
    super('Falha de rede.', { cause: causa });
    this.name = 'ErroRede';
  }
}

/** A resposta não confere com o contrato, ou o erro não tem a forma padrão (ex.: HTML de 429/502). */
export class ErroResposta extends Error {
  readonly status: number;

  constructor(status: number, detalhe: string) {
    super(`Resposta inesperada da API (${status}): ${detalhe}`);
    this.name = 'ErroResposta';
    this.status = status;
  }
}

export function ehErroDeRede(erro: unknown): erro is ErroRede {
  return erro instanceof ErroRede;
}
