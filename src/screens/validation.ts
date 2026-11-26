/**
 * Validação de tela dos formulários: mostra TODOS os problemas de uma vez, embaixo de
 * cada campo, antes de chamar o domínio. As mensagens são as mesmas do domínio
 * (src/domain/items.ts e installments.ts), que continua sendo a garantia final.
 */
export type FieldKey = 'type' | 'name' | 'cents' | 'installments';
export type FieldErrors = Partial<Record<FieldKey, string>>;

export function validateItemForm(
  form: { type: string | null; name: string; cents: number },
  opts: { installments?: number; isTotal?: boolean } = {},
): FieldErrors {
  const e: FieldErrors = {};
  if (!form.type) e.type = 'Escolha um tipo.';
  if (form.name.trim() === '') e.name = 'Informe o nome.';
  if (form.cents <= 0) e.cents = opts.isTotal ? 'Informe o valor total da compra.' : 'Informe um valor maior que zero.';
  if (opts.installments !== undefined) {
    const n = opts.installments;
    if (!Number.isInteger(n) || n < 1 || n > 120) e.installments = 'Use de 1 a 120 parcelas.';
  }
  return e;
}

export const hasErrors = (e: FieldErrors): boolean => Object.values(e).some(Boolean);

/** Remove o erro de um campo assim que o usuário mexe nele. */
export const clearError = (e: FieldErrors, key: FieldKey): FieldErrors => (e[key] ? { ...e, [key]: undefined } : e);
