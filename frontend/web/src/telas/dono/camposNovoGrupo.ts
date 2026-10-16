/** Campos do formulário "Novo grupo": chave do 422 da API, id no DOM e rótulo no resumo de erros. */
export const CAMPOS_NOVO_GRUPO = [
  { chave: 'nome', id: 'ng-nome', rotulo: 'Nome do grupo' },
  { chave: 'diaSemana', id: 'ng-dia', rotulo: 'Dia da semana' },
  { chave: 'horario', id: 'ng-horario', rotulo: 'Horário' },
  { chave: 'frequencia', id: 'ng-frequencia', rotulo: 'Frequência' },
  { chave: 'adminNome', id: 'ng-admin-nome', rotulo: 'Nome do primeiro admin' },
  { chave: 'adminEmail', id: 'ng-admin-email', rotulo: 'E-mail do primeiro admin' },
] as const;

export type ChaveNovoGrupo = (typeof CAMPOS_NOVO_GRUPO)[number]['chave'];
