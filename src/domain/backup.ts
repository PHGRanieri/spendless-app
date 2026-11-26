import { Db, transaction } from '../db/adapter';
import { SCHEMA_VERSION } from '../db/migrations';
import { EXPENSE_TYPES, INCOME_TYPES, MAX_MONTHS, PAYMENT_METHOD_KEYS, PaymentMethod } from '../constants';
import { isDate, isMonth } from '../dates';
import {
  toCreditPurchase,
  toFixedExpense,
  toIncome,
  toMonth,
  toSeries,
  toVariableExpense,
} from './repo';
import type {
  CreditPurchase,
  FixedExpense,
  Income,
  Month,
  Series,
  VariableExpense,
} from './types';

export const BACKUP_APP_ID = '$pendless';

export interface BackupData {
  months: Month[];
  series: Series[];
  incomes: Income[];
  fixedExpenses: FixedExpense[];
  creditPurchases: CreditPurchase[];
  variableExpenses: VariableExpense[];
}

export interface BackupFile {
  app: typeof BACKUP_APP_ID;
  schemaVersion: number;
  exportedAt: string;
  data: BackupData;
}

export interface BackupSummary {
  months: number;
  items: number;
  monthIds: string[];
}

/* ---------------- Exportar ---------------- */

export function exportBackup(db: Db, now: Date): BackupFile {
  const all = <T,>(sql: string, map: (r: Record<string, unknown>) => T) =>
    db.all<Record<string, unknown>>(sql).map(map);
  return {
    app: BACKUP_APP_ID,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    data: {
      months: all('SELECT * FROM months ORDER BY id', toMonth),
      series: all('SELECT * FROM series ORDER BY id', toSeries),
      incomes: all('SELECT * FROM incomes ORDER BY id', toIncome),
      fixedExpenses: all('SELECT * FROM fixed_expenses ORDER BY id', toFixedExpense),
      creditPurchases: all('SELECT * FROM credit_purchases ORDER BY id', toCreditPurchase),
      variableExpenses: all('SELECT * FROM variable_expenses ORDER BY id', toVariableExpense),
    },
  };
}

export function serializeBackup(backup: BackupFile): string {
  return JSON.stringify(backup, null, 2);
}

export function backupFileName(now: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `spendless-backup-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}.json`;
}

export function summarizeBackup(b: BackupFile): BackupSummary {
  const d = b.data;
  return {
    months: d.months.length,
    items: d.incomes.length + d.fixedExpenses.length + d.variableExpenses.length,
    monthIds: d.months.map((m) => m.id),
  };
}

/* ---------------- Validar ---------------- */

class InvalidBackup extends Error {}

function fail(msg: string): never {
  throw new InvalidBackup(msg);
}

type Obj = Record<string, unknown>;

function isObj(v: unknown): v is Obj {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function arr(data: Obj, key: string): Obj[] {
  const v = data[key];
  if (!Array.isArray(v)) fail(`"${key}" ausente ou não é uma lista.`);
  v.forEach((item, i) => {
    if (!isObj(item)) fail(`${key}[${i}] não é um objeto.`);
  });
  return v as Obj[];
}

function field(o: Obj, key: string, where: string) {
  const v = o[key];
  return {
    int(min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER): number {
      if (typeof v !== 'number' || !Number.isSafeInteger(v) || v < min || v > max) {
        fail(`${where}.${key} deve ser um número inteiro${min >= 0 ? ' não negativo' : ''}.`);
      }
      return v;
    },
    optInt(min = 1): number | null {
      if (v === null) return null;
      if (typeof v !== 'number' || !Number.isSafeInteger(v) || v < min) fail(`${where}.${key} inválido.`);
      return v;
    },
    str(nonEmpty = false): string {
      if (typeof v !== 'string' || (nonEmpty && v.trim() === '')) fail(`${where}.${key} deve ser um texto.`);
      return v;
    },
    optStr(): string | null {
      if (v === null) return null;
      if (typeof v !== 'string') fail(`${where}.${key} deve ser texto ou null.`);
      return v;
    },
    bool(): boolean {
      if (typeof v !== 'boolean') fail(`${where}.${key} deve ser true ou false.`);
      return v;
    },
    oneOf<T extends string = string>(options: readonly string[]): T {
      if (typeof v !== 'string' || !options.includes(v)) fail(`${where}.${key} tem um valor não permitido.`);
      return v as T;
    },
    month(): string {
      if (!isMonth(v)) fail(`${where}.${key} deve ser um mês AAAA-MM.`);
      return v;
    },
    optMonth(): string | null {
      if (v === null) return null;
      if (!isMonth(v)) fail(`${where}.${key} deve ser um mês AAAA-MM ou null.`);
      return v;
    },
    date(): string {
      if (!isDate(v)) fail(`${where}.${key} deve ser uma data AAAA-MM-DD.`);
      return v;
    },
  };
}

function uniqueIds(items: { id: number | string }[], where: string): void {
  const seen = new Set<number | string>();
  for (const i of items) {
    if (seen.has(i.id)) fail(`${where}: id repetido (${i.id}).`);
    seen.add(i.id);
  }
}

/**
 * Lê e valida o conteúdo de um arquivo de backup. Nada é gravado aqui.
 * Lança um erro com mensagem clara se o arquivo for inválido.
 */
export function parseBackup(text: string): BackupFile {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('O arquivo não é um JSON válido (pode estar corrompido ou incompleto).');
  }
  try {
    return validateBackup(raw);
  } catch (e) {
    if (e instanceof InvalidBackup) throw new Error(`Arquivo de backup inválido: ${e.message}`);
    throw e;
  }
}

function validateBackup(raw: unknown): BackupFile {
  if (!isObj(raw)) fail('o conteúdo não é um objeto.');
  if (raw.app !== BACKUP_APP_ID) fail('este arquivo não foi gerado pelo $pendless.');
  const version = raw.schemaVersion;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    fail('schemaVersion ausente ou inválido.');
  }
  if (version > SCHEMA_VERSION) {
    fail(`o arquivo é da versão ${version} e este app só entende até a versão ${SCHEMA_VERSION}. Atualize o app.`);
  }
  if (typeof raw.exportedAt !== 'string' || Number.isNaN(Date.parse(raw.exportedAt))) {
    fail('exportedAt ausente ou inválido.');
  }
  if (!isObj(raw.data)) fail('"data" ausente.');
  const d = raw.data;

  const months: Month[] = arr(d, 'months').map((o, i) => {
    const f = (k: string) => field(o, k, `months[${i}]`);
    return { id: f('id').month(), createdAt: f('createdAt').str(true), origin: f('origin').oneOf(['manual', 'auto', 'import']) };
  });
  uniqueIds(months, 'months');
  if (months.length > MAX_MONTHS) fail(`o arquivo tem ${months.length} meses; o máximo é ${MAX_MONTHS}.`);
  const monthSet = new Set(months.map((m) => m.id));
  const checkMonth = (m: string, where: string) => {
    if (!monthSet.has(m)) fail(`${where} aponta para um mês que não está no arquivo (${m}).`);
  };

  const series: Series[] = arr(d, 'series').map((o, i) => {
    const f = (k: string) => field(o, k, `series[${i}]`);
    const kind = f('kind').oneOf<Series['kind']>(['income', 'fixed_expense']);
    return {
      id: f('id').int(1),
      kind,
      type: f('type').oneOf(kind === 'income' ? INCOME_TYPES : EXPENSE_TYPES),
      name: f('name').str(true),
      amountCents: f('amountCents').int(0),
      day: f('day').int(1, 31),
      note: f('note').optStr(),
      startMonth: f('startMonth').month(),
      endMonth: f('endMonth').optMonth(),
    };
  });
  uniqueIds(series, 'series');
  const seriesKind = new Map(series.map((s) => [s.id, s.kind]));

  const incomes: Income[] = arr(d, 'incomes').map((o, i) => {
    const w = `incomes[${i}]`;
    const f = (k: string) => field(o, k, w);
    const inc: Income = {
      id: f('id').int(1),
      month: f('month').month(),
      seriesId: f('seriesId').optInt(),
      recurrence: f('recurrence').oneOf(['fixa', 'mes']),
      type: f('type').oneOf(INCOME_TYPES),
      name: f('name').str(true),
      amountCents: f('amountCents').int(0),
      date: f('date').date(),
      received: f('received').bool(),
      note: f('note').optStr(),
    };
    checkMonth(inc.month, w);
    if (inc.seriesId != null && seriesKind.get(inc.seriesId) !== 'income') fail(`${w}.seriesId inválido.`);
    if ((inc.recurrence === 'fixa') !== (inc.seriesId != null)) fail(`${w}: recorrência e série não combinam.`);
    return inc;
  });
  uniqueIds(incomes, 'incomes');

  const fixedExpenses: FixedExpense[] = arr(d, 'fixedExpenses').map((o, i) => {
    const w = `fixedExpenses[${i}]`;
    const f = (k: string) => field(o, k, w);
    const fe: FixedExpense = {
      id: f('id').int(1),
      month: f('month').month(),
      seriesId: f('seriesId').int(1),
      type: f('type').oneOf(EXPENSE_TYPES),
      name: f('name').str(true),
      amountCents: f('amountCents').int(0),
      dueDate: f('dueDate').date(),
      paid: f('paid').bool(),
      note: f('note').optStr(),
    };
    checkMonth(fe.month, w);
    if (seriesKind.get(fe.seriesId) !== 'fixed_expense') fail(`${w}.seriesId inválido.`);
    return fe;
  });
  uniqueIds(fixedExpenses, 'fixedExpenses');

  const creditPurchases: CreditPurchase[] = arr(d, 'creditPurchases').map((o, i) => {
    const f = (k: string) => field(o, k, `creditPurchases[${i}]`);
    return {
      id: f('id').int(1),
      type: f('type').oneOf(EXPENSE_TYPES),
      name: f('name').str(true),
      totalCents: f('totalCents').int(0),
      installments: f('installments').int(1, 120),
      firstMonth: f('firstMonth').month(),
      dueDay: f('dueDay').int(1, 31),
      note: f('note').optStr(),
      installmentCents: f('installmentCents').int(0),
      lastInstallmentCents: f('lastInstallmentCents').int(0),
    };
  });
  uniqueIds(creditPurchases, 'creditPurchases');
  const purchaseById = new Map(creditPurchases.map((p) => [p.id, p]));

  const variableExpenses: VariableExpense[] = arr(d, 'variableExpenses').map((o, i) => {
    const w = `variableExpenses[${i}]`;
    const f = (k: string) => field(o, k, w);
    const ve: VariableExpense = {
      id: f('id').int(1),
      month: f('month').month(),
      type: f('type').oneOf(EXPENSE_TYPES),
      name: f('name').str(true),
      amountCents: f('amountCents').int(0),
      dueDate: f('dueDate').date(),
      paid: f('paid').bool(),
      note: f('note').optStr(),
      paymentMethod: f('paymentMethod').oneOf<PaymentMethod>(PAYMENT_METHOD_KEYS),
      purchaseId: f('purchaseId').optInt(),
      installmentNo: f('installmentNo').optInt(),
    };
    checkMonth(ve.month, w);
    if ((ve.purchaseId == null) !== (ve.installmentNo == null)) fail(`${w}: parcela incompleta.`);
    if (ve.purchaseId != null) {
      const p = purchaseById.get(ve.purchaseId);
      if (!p) fail(`${w}.purchaseId aponta para uma compra inexistente.`);
      if (ve.installmentNo! > p.installments) fail(`${w}.installmentNo maior que o número de parcelas.`);
      if (ve.paymentMethod !== 'credito') fail(`${w}: parcela precisa ser no crédito.`);
    }
    return ve;
  });
  uniqueIds(variableExpenses, 'variableExpenses');

  const seen = new Set<string>();
  for (const x of [
    ...incomes.filter((i) => i.seriesId != null).map((i) => `i:${i.month}:${i.seriesId}`),
    ...fixedExpenses.map((e) => `f:${e.month}:${e.seriesId}`),
    ...variableExpenses.filter((v) => v.purchaseId != null).map((v) => `v:${v.purchaseId}:${v.installmentNo}`),
  ]) {
    if (seen.has(x)) fail('há itens duplicados no arquivo.');
    seen.add(x);
  }

  return {
    app: BACKUP_APP_ID,
    schemaVersion: version,
    exportedAt: raw.exportedAt as string,
    data: { months, series, incomes, fixedExpenses, creditPurchases, variableExpenses },
  };
}

/* ---------------- Importar ---------------- */

const b = (v: boolean) => (v ? 1 : 0);

/**
 * Substitui TODOS os dados pelos do backup em UMA transação, preservando ids
 * e status. Se qualquer passo falhar, o ROLLBACK mantém os dados atuais intactos.
 */
export function importBackup(db: Db, backup: BackupFile): void {
  const d = backup.data;
  transaction(db, () => {
    db.run('DELETE FROM variable_expenses');
    db.run('DELETE FROM fixed_expenses');
    db.run('DELETE FROM incomes');
    db.run('DELETE FROM credit_purchases');
    db.run('DELETE FROM series');
    db.run('DELETE FROM months');

    for (const m of d.months) {
      db.run('INSERT INTO months (id, created_at, origin) VALUES (?, ?, ?)', [m.id, m.createdAt, m.origin]);
    }
    for (const s of d.series) {
      db.run(
        `INSERT INTO series (id, kind, type, name, amount_cents, day, note, start_month, end_month)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [s.id, s.kind, s.type, s.name, s.amountCents, s.day, s.note, s.startMonth, s.endMonth],
      );
    }
    for (const i of d.incomes) {
      db.run(
        `INSERT INTO incomes (id, month, series_id, recurrence, type, name, amount_cents, date, received, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [i.id, i.month, i.seriesId, i.recurrence, i.type, i.name, i.amountCents, i.date, b(i.received), i.note],
      );
    }
    for (const e of d.fixedExpenses) {
      db.run(
        `INSERT INTO fixed_expenses (id, month, series_id, type, name, amount_cents, due_date, paid, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [e.id, e.month, e.seriesId, e.type, e.name, e.amountCents, e.dueDate, b(e.paid), e.note],
      );
    }
    for (const p of d.creditPurchases) {
      db.run(
        `INSERT INTO credit_purchases
           (id, type, name, total_cents, installments, first_month, due_day, note, installment_cents, last_installment_cents)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [p.id, p.type, p.name, p.totalCents, p.installments, p.firstMonth, p.dueDay, p.note,
          p.installmentCents, p.lastInstallmentCents],
      );
    }
    for (const v of d.variableExpenses) {
      db.run(
        `INSERT INTO variable_expenses
           (id, month, type, name, amount_cents, due_date, paid, note, payment_method, purchase_id, installment_no)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [v.id, v.month, v.type, v.name, v.amountCents, v.dueDate, b(v.paid), v.note, v.paymentMethod,
          v.purchaseId, v.installmentNo],
      );
    }
  });
}
