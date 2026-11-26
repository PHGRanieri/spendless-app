import type { PaymentMethod, Recurrence } from '../constants';

export type MonthOrigin = 'manual' | 'auto' | 'import';
export type SeriesKind = 'income' | 'fixed_expense';
/** Escopo de edição/exclusão de itens fixos. */
export type EditScope = 'only_this' | 'this_and_next';

export interface Month {
  id: string;
  createdAt: string;
  origin: MonthOrigin;
}

export interface Series {
  id: number;
  kind: SeriesKind;
  type: string;
  name: string;
  amountCents: number;
  day: number;
  note: string | null;
  startMonth: string;
  endMonth: string | null;
}

export interface Income {
  id: number;
  month: string;
  seriesId: number | null;
  recurrence: Recurrence;
  type: string;
  name: string;
  amountCents: number;
  date: string;
  received: boolean;
  note: string | null;
}

export interface FixedExpense {
  id: number;
  month: string;
  seriesId: number;
  type: string;
  name: string;
  amountCents: number;
  dueDate: string;
  paid: boolean;
  note: string | null;
}

export interface CreditPurchase {
  id: number;
  type: string;
  name: string;
  totalCents: number;
  installments: number;
  firstMonth: string;
  dueDay: number;
  note: string | null;
  /** Valor atual de cada parcela, exceto a última. */
  installmentCents: number;
  /** Valor atual da última parcela (recebe o resto da divisão). */
  lastInstallmentCents: number;
}

export interface VariableExpense {
  id: number;
  month: string;
  type: string;
  name: string;
  amountCents: number;
  dueDate: string;
  paid: boolean;
  note: string | null;
  paymentMethod: PaymentMethod;
  purchaseId: number | null;
  installmentNo: number | null;
}

/** Gasto variável com dados da compra parcelada (para rótulo "Nome (3/10)"). */
export interface VariableExpenseView extends VariableExpense {
  installments: number | null;
  totalCents: number | null;
}

/** Dados digitados pelo usuário. Não há campo de status: todo item nasce pendente. */
export interface IncomeInput {
  type: string;
  name: string;
  amountCents: number;
  date: string;
  recurrence: Recurrence;
  note: string | null;
}

export interface FixedExpenseInput {
  type: string;
  name: string;
  amountCents: number;
  dueDate: string;
  note: string | null;
}

export interface VariableExpenseInput {
  type: string;
  name: string;
  /** Para crédito: valor TOTAL da compra. */
  amountCents: number;
  dueDate: string;
  note: string | null;
  paymentMethod: PaymentMethod;
  /** Só para crédito. */
  installments?: number;
}

/** Erro de regra de negócio com mensagem pronta para o usuário. */
export class UserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserError';
  }
}
