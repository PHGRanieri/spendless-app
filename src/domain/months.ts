import { Db, transaction } from '../db/adapter';
import { AUTO_CREATE_DAY, MAX_MONTHS } from '../constants';
import { addMonths, dateInMonth, monthOf } from '../dates';
import { insertInstallmentForMonth, slotMonth } from './installments';
import { listMonths, monthExists, toCreditPurchase, toSeries } from './repo';
import { MonthOrigin } from './types';

/**
 * Preenche um mês recém-criado com:
 * - entradas fixas e gastos fixos das séries ativas nele;
 * - parcelas de cartão que vencem nele.
 * Entradas "do mês" nunca são copiadas. Todo item nasce pendente (0):
 * o status de origem NUNCA é lido nem copiado.
 * INSERT OR IGNORE + chaves UNIQUE tornam a operação idempotente.
 */
function populateMonth(db: Db, month: string): void {
  const series = db
    .all<Record<string, unknown>>(
      `SELECT * FROM series
        WHERE start_month <= ? AND (end_month IS NULL OR end_month >= ?)
        ORDER BY id`,
      [month, month],
    )
    .map(toSeries);

  for (const s of series) {
    const date = dateInMonth(month, s.day);
    if (s.kind === 'income') {
      db.run(
        `INSERT OR IGNORE INTO incomes
           (month, series_id, recurrence, type, name, amount_cents, date, received, note)
         VALUES (?, ?, 'fixa', ?, ?, ?, ?, 0, ?)`,
        [month, s.id, s.type, s.name, s.amountCents, date, s.note],
      );
    } else {
      db.run(
        `INSERT OR IGNORE INTO fixed_expenses
           (month, series_id, type, name, amount_cents, due_date, paid, note)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
        [month, s.id, s.type, s.name, s.amountCents, date, s.note],
      );
    }
  }

  const purchases = db
    .all<Record<string, unknown>>('SELECT * FROM credit_purchases ORDER BY id')
    .map(toCreditPurchase);
  for (const p of purchases) insertInstallmentForMonth(db, p, month);
}

/** Remove os meses mais antigos (com seus itens) e limpa registros sem uso. */
function removeMonths(db: Db, months: string[]): void {
  for (const m of months) db.run('DELETE FROM months WHERE id = ?', [m]);
  const oldest = listMonths(db)[0];
  if (!oldest) return;
  // Séries encerradas antes do mês mais antigo restante já não têm itens.
  db.run('DELETE FROM series WHERE end_month IS NOT NULL AND end_month < ?', [oldest]);
  // Compras cuja última parcela caiu antes do mês mais antigo restante.
  const purchases = db.all<Record<string, unknown>>('SELECT * FROM credit_purchases').map(toCreditPurchase);
  for (const p of purchases) {
    if (slotMonth(p, p.installments) < oldest) {
      db.run('DELETE FROM credit_purchases WHERE id = ?', [p.id]);
    }
  }
}

export type CreateMonthResult =
  | { status: 'created'; month: string; removed: string[] }
  | { status: 'exists'; month: string }
  | { status: 'needs_confirmation'; month: string; toRemove: string[] };

/**
 * Cria um mês (idempotente). Se o histórico já tem 12 meses, NADA é alterado
 * até o usuário confirmar (`confirmRemoval: true`); aí a remoção do(s) mais
 * antigo(s) e a criação acontecem na MESMA transação.
 */
export function createMonth(
  db: Db,
  month: string,
  origin: MonthOrigin,
  opts: { now: Date; confirmRemoval?: boolean },
): CreateMonthResult {
  return transaction(db, () => {
    if (monthExists(db, month)) return { status: 'exists', month } as const;

    const existing = listMonths(db);
    const excess = existing.length + 1 - MAX_MONTHS;
    const toRemove = excess > 0 ? existing.slice(0, excess) : [];
    if (toRemove.length > 0 && !opts.confirmRemoval) {
      return { status: 'needs_confirmation', month, toRemove } as const;
    }

    if (toRemove.length > 0) removeMonths(db, toRemove);
    db.run('INSERT INTO months (id, created_at, origin) VALUES (?, ?, ?)', [
      month,
      opts.now.toISOString(),
      origin,
    ]);
    populateMonth(db, month);
    return { status: 'created', month, removed: toRemove } as const;
  });
}

/** Próximo mês que o usuário pode criar manualmente. */
export function nextMonthToCreate(db: Db, now: Date): string {
  const months = listMonths(db);
  return months.length ? addMonths(months[months.length - 1], 1) : monthOf(now);
}

/**
 * Mês que deve ser criado automaticamente agora (ao abrir o app ou voltar
 * para o primeiro plano): se o dia for >= 20 e o mês seguinte não existir.
 */
export function autoCreateTarget(db: Db, now: Date): string | null {
  if (now.getDate() < AUTO_CREATE_DAY) return null;
  const next = addMonths(monthOf(now), 1);
  return monthExists(db, next) ? null : next;
}

/** Executa a regra de criação automática. */
export function runAutoCreate(db: Db, now: Date, confirmRemoval = false): CreateMonthResult | null {
  const target = autoCreateTarget(db, now);
  if (!target) return null;
  return createMonth(db, target, 'auto', { now, confirmRemoval });
}

/** No primeiro uso (banco vazio), cria o mês atual. */
export function ensureInitialMonth(db: Db, now: Date): void {
  if (listMonths(db).length === 0) createMonth(db, monthOf(now), 'manual', { now });
}
