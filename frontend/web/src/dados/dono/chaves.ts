/** Chaves das consultas da área do dono (não pertencem a nenhum grupo do admin). */
export const chavesDono = {
  todas: ['dono'] as const,
  painel: ['dono', 'painel'] as const,
  grupo: (grupoId: string) => ['dono', 'grupo', grupoId] as const,
};
