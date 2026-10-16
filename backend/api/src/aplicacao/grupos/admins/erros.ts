export class AdminNaoEncontrado extends Error {
  constructor() {
    super('Admin não encontrado neste grupo.');
  }
}
export class RemoverASiMesmo extends Error {
  constructor() {
    super('Você não pode remover a si mesmo.');
  }
}
export class UltimoAdmin extends Error {
  constructor() {
    super('Todo grupo precisa de pelo menos um admin.');
  }
}
export class AcaoNaPropriaConta extends Error {
  constructor() {
    super('Essa ação não vale para a própria conta.');
  }
}
