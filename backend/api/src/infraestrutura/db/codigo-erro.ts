/** Código SQLSTATE do erro do driver, quando houver. */
export const codigoDe = (erro: unknown): string | undefined => (erro as { code?: string }).code;
