export const INCOME_TYPES = [
  'Salário',
  'Freelance',
  'Rendimentos',
  'Reembolso',
  'Venda',
  'Outros',
] as const;

export const EXPENSE_TYPES = [
  'Contas de casa',
  'Alimentação',
  'Mercado',
  'Transporte',
  'Saúde',
  'Academia',
  'Estudos',
  'Lazer',
  'Assinaturas',
  'Pets',
  'Vestuário',
  'Cuidados pessoais',
  'Viagem',
  'Impostos e taxas',
  'Outros',
] as const;

export const PAYMENT_METHODS = [
  { key: 'credito', label: 'Crédito' },
  { key: 'debito', label: 'Débito' },
  { key: 'pix', label: 'Pix' },
  { key: 'dinheiro', label: 'Dinheiro' },
  { key: 'boleto', label: 'Boleto' },
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]['key'];
export type Recurrence = 'fixa' | 'mes';

export const PAYMENT_METHOD_KEYS: readonly string[] = PAYMENT_METHODS.map((p) => p.key);

export function paymentMethodLabel(key: string): string {
  return PAYMENT_METHODS.find((p) => p.key === key)?.label ?? key;
}

/** Máximo de meses guardados no histórico. */
export const MAX_MONTHS = 12;

/** Dia do mês a partir do qual o próximo mês é criado automaticamente. */
export const AUTO_CREATE_DAY = 20;
