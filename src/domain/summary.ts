import type { Db } from '../db/adapter';
import { listFixedExpenses, listIncomes, listVariableExpenses } from './repo';

export interface IncomeLike {
  amountCents: number;
  received: boolean;
}

export interface ExpenseLike {
  type: string;
  amountCents: number;
  paid: boolean;
}

export interface TypeTotal {
  type: string;
  cents: number;
  /** Proporção em relação ao total de saídas previstas (0..1), só para a barra. */
  share: number;
}

export interface MonthSummary {
  incomesReceived: number;
  incomesExpected: number;
  expensesPaid: number;
  expensesExpected: number;
  /** Entradas recebidas − gastos pagos. */
  balanceNow: number;
  /** Todas as entradas − todos os gastos, recebidos/pagos ou não. */
  balanceForecast: number;
  byType: TypeTotal[];
}

/** Cálculo puro (inteiros em centavos). */
export function computeSummary(incomes: IncomeLike[], expenses: ExpenseLike[]): MonthSummary {
  let incomesReceived = 0;
  let incomesExpected = 0;
  for (const i of incomes) {
    incomesExpected += i.amountCents;
    if (i.received) incomesReceived += i.amountCents;
  }

  let expensesPaid = 0;
  let expensesExpected = 0;
  const perType = new Map<string, number>();
  for (const e of expenses) {
    expensesExpected += e.amountCents;
    if (e.paid) expensesPaid += e.amountCents;
    perType.set(e.type, (perType.get(e.type) ?? 0) + e.amountCents);
  }

  const byType = [...perType.entries()]
    .map(([type, cents]) => ({ type, cents, share: expensesExpected > 0 ? cents / expensesExpected : 0 }))
    .sort((a, b) => b.cents - a.cents || a.type.localeCompare(b.type));

  return {
    incomesReceived,
    incomesExpected,
    expensesPaid,
    expensesExpected,
    balanceNow: incomesReceived - expensesPaid,
    balanceForecast: incomesExpected - expensesExpected,
    byType,
  };
}

export function loadMonthSummary(db: Db, month: string): MonthSummary {
  return computeSummary(listIncomes(db, month), [
    ...listFixedExpenses(db, month),
    ...listVariableExpenses(db, month),
  ]);
}
