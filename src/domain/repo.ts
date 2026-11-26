import type { Db } from '../db/adapter';
import type {
  CreditPurchase,
  FixedExpense,
  Income,
  Month,
  Series,
  VariableExpense,
  VariableExpenseView,
} from './types';

/* Linhas cruas do SQLite (snake_case) e conversão para o formato do app. */

type Row = Record<string, unknown>;
const str = (v: unknown) => v as string;
const num = (v: unknown) => Number(v);
const optStr = (v: unknown) => (v == null ? null : (v as string));
const optNum = (v: unknown) => (v == null ? null : Number(v));
const bool = (v: unknown) => Number(v) === 1;

export const toMonth = (r: Row): Month => ({
  id: str(r.id),
  createdAt: str(r.created_at),
  origin: r.origin as Month['origin'],
});

export const toSeries = (r: Row): Series => ({
  id: num(r.id),
  kind: r.kind as Series['kind'],
  type: str(r.type),
  name: str(r.name),
  amountCents: num(r.amount_cents),
  day: num(r.day),
  note: optStr(r.note),
  startMonth: str(r.start_month),
  endMonth: optStr(r.end_month),
});

export const toIncome = (r: Row): Income => ({
  id: num(r.id),
  month: str(r.month),
  seriesId: optNum(r.series_id),
  recurrence: r.recurrence as Income['recurrence'],
  type: str(r.type),
  name: str(r.name),
  amountCents: num(r.amount_cents),
  date: str(r.date),
  received: bool(r.received),
  note: optStr(r.note),
});

export const toFixedExpense = (r: Row): FixedExpense => ({
  id: num(r.id),
  month: str(r.month),
  seriesId: num(r.series_id),
  type: str(r.type),
  name: str(r.name),
  amountCents: num(r.amount_cents),
  dueDate: str(r.due_date),
  paid: bool(r.paid),
  note: optStr(r.note),
});

export const toCreditPurchase = (r: Row): CreditPurchase => ({
  id: num(r.id),
  type: str(r.type),
  name: str(r.name),
  totalCents: num(r.total_cents),
  installments: num(r.installments),
  firstMonth: str(r.first_month),
  dueDay: num(r.due_day),
  note: optStr(r.note),
  installmentCents: num(r.installment_cents),
  lastInstallmentCents: num(r.last_installment_cents),
});

export const toVariableExpense = (r: Row): VariableExpense => ({
  id: num(r.id),
  month: str(r.month),
  type: str(r.type),
  name: str(r.name),
  amountCents: num(r.amount_cents),
  dueDate: str(r.due_date),
  paid: bool(r.paid),
  note: optStr(r.note),
  paymentMethod: r.payment_method as VariableExpense['paymentMethod'],
  purchaseId: optNum(r.purchase_id),
  installmentNo: optNum(r.installment_no),
});

/* Consultas por mês */

export function listIncomes(db: Db, month: string): Income[] {
  return db
    .all<Row>('SELECT * FROM incomes WHERE month = ? ORDER BY date, id', [month])
    .map(toIncome);
}

export function listFixedExpenses(db: Db, month: string): FixedExpense[] {
  return db
    .all<Row>('SELECT * FROM fixed_expenses WHERE month = ? ORDER BY due_date, id', [month])
    .map(toFixedExpense);
}

export function listVariableExpenses(db: Db, month: string): VariableExpenseView[] {
  return db
    .all<Row>(
      `SELECT v.*, p.installments AS p_installments, p.total_cents AS p_total
         FROM variable_expenses v
         LEFT JOIN credit_purchases p ON p.id = v.purchase_id
        WHERE v.month = ?
        ORDER BY v.due_date, v.id`,
      [month],
    )
    .map((r) => ({
      ...toVariableExpense(r),
      installments: optNum(r.p_installments),
      totalCents: optNum(r.p_total),
    }));
}

export function getIncome(db: Db, id: number): Income | null {
  const r = db.first<Row>('SELECT * FROM incomes WHERE id = ?', [id]);
  return r ? toIncome(r) : null;
}

export function getFixedExpense(db: Db, id: number): FixedExpense | null {
  const r = db.first<Row>('SELECT * FROM fixed_expenses WHERE id = ?', [id]);
  return r ? toFixedExpense(r) : null;
}

export function getVariableExpense(db: Db, id: number): VariableExpense | null {
  const r = db.first<Row>('SELECT * FROM variable_expenses WHERE id = ?', [id]);
  return r ? toVariableExpense(r) : null;
}

export function getSeries(db: Db, id: number): Series | null {
  const r = db.first<Row>('SELECT * FROM series WHERE id = ?', [id]);
  return r ? toSeries(r) : null;
}

export function getCreditPurchase(db: Db, id: number): CreditPurchase | null {
  const r = db.first<Row>('SELECT * FROM credit_purchases WHERE id = ?', [id]);
  return r ? toCreditPurchase(r) : null;
}

export function listMonths(db: Db): string[] {
  return db.all<{ id: string }>('SELECT id FROM months ORDER BY id').map((r) => r.id);
}

export function monthExists(db: Db, month: string): boolean {
  return db.first('SELECT 1 AS x FROM months WHERE id = ?', [month]) !== null;
}

/** Rótulo de exibição: "Nome (3/10)" para parcelas de cartão. */
export function displayName(item: VariableExpenseView): string {
  if (item.installmentNo != null && item.installments != null) {
    return `${item.name} (${item.installmentNo}/${item.installments})`;
  }
  return item.name;
}
