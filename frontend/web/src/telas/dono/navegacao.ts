export const caminhoAreaDono = '/dono';
export const caminhoNovoGrupo = '/dono/grupos/novo';

export const caminhoGrupoDono = (grupoId: string) => `/dono/grupos/${encodeURIComponent(grupoId)}`;

/** Recado da criação do grupo para a tela do grupo: o primeiro admin já existia e só foi vinculado. */
export interface EstadoGrupoDono {
  aviso: 'vinculo';
}

export const estadoVinculo: EstadoGrupoDono = { aviso: 'vinculo' };

export function lerAvisoGrupoDono(estado: unknown): EstadoGrupoDono['aviso'] | null {
  if (typeof estado !== 'object' || estado === null || !('aviso' in estado)) return null;
  return estado.aviso === 'vinculo' ? 'vinculo' : null;
}
