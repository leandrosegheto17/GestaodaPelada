const soDigitos = (texto: string) => texto.replace(/\D/g, '');

/** `11987654321` → `(11) 98765-4321`. Se não tiver 11 dígitos, devolve como veio. */
export function formatarTelefone(telefone: string): string {
  const d = soDigitos(telefone);
  return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : telefone;
}

/** Máscara progressiva enquanto digita: só dígitos, no máximo 11, `(DD) 9XXXX-XXXX`. */
export function mascararTelefone(digitado: string): string {
  const d = soDigitos(digitado).slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Só os dígitos, para enviar à API (`null` se vazio). A validação final é do contrato. */
export function digitosDoTelefone(telefone: string): string | null {
  const d = soDigitos(telefone);
  return d === '' ? null : d;
}
