import { createMonth } from '../../src/domain/months';
import { openNodeDb, TestDb } from './nodeDb';
import type { Db } from '../../src/db/adapter';

/** Data local (mês 1-based para legibilidade). */
export const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12, 0, 0);

export const TODAY = '2026-01-01';

export function freshDb(firstMonth = '2026-11'): TestDb {
  const db = openNodeDb();
  createMonth(db, firstMonth, 'manual', { now: at(2026, 11, 1) });
  return db;
}

export function counts(db: Db) {
  const c = (t: string) => db.first<{ n: number }>(`SELECT COUNT(*) AS n FROM ${t}`)!.n;
  return {
    months: c('months'),
    incomes: c('incomes'),
    fixed: c('fixed_expenses'),
    variable: c('variable_expenses'),
    purchases: c('credit_purchases'),
    series: c('series'),
  };
}

/** Copia todo o conteúdo do banco para comparação. */
export function dump(db: Db) {
  const t = (name: string) => db.all(`SELECT * FROM ${name} ORDER BY 1`);
  return {
    months: t('months'),
    series: t('series'),
    incomes: t('incomes'),
    fixed: t('fixed_expenses'),
    purchases: t('credit_purchases'),
    variable: t('variable_expenses'),
  };
}

export function statuses(db: Db) {
  return {
    incomes: db.all<{ received: number }>('SELECT received FROM incomes').map((r) => r.received),
    fixed: db.all<{ paid: number }>('SELECT paid FROM fixed_expenses').map((r) => r.paid),
    variable: db.all<{ paid: number }>('SELECT paid FROM variable_expenses').map((r) => r.paid),
  };
}
