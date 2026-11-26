import { Db, transaction } from '../db/adapter';
import { EXPENSE_TYPES, INCOME_TYPES, PAYMENT_METHOD_KEYS } from '../constants';
import { addMonths, dateInMonth, dayOf, isDate, monthOfDate } from '../dates';
import { createCreditPurchase, recalcCreditPurchase } from './installments';
import {
  getCreditPurchase,
  getFixedExpense,
  getIncome,
  getVariableExpense,
  listMonths,
  monthExists,
} from './repo';
import {
  EditScope,
  FixedExpenseInput,
  IncomeInput,
  UserError,
  VariableExpenseInput,
} from './types';

/*
 * Regra: todo item criado aqui nasce PENDENTE ("não recebida" / "não pago").
 * Os inputs não têm campo de status, e os INSERTs gravam 0 explicitamente.
 * O status só muda pelas funções toggle*.
 */

function cleanNote(note: string | null): string | null {
  const t = (note ?? '').trim();
  return t === '' ? null : t;
}

function validateCommon(
  input: { type: string; name: string; amountCents: number },
  types: readonly string[],
  month: string,
  date: string,
): void {
  if (!types.includes(input.type)) throw new UserError('Selecione um tipo válido.');
  if (input.name.trim() === '') throw new UserError('Informe o nome.');
  if (!Number.isSafeInteger(input.amountCents) || input.amountCents <= 0) {
    throw new UserError('Informe um valor maior que zero.');
  }
  if (!isDate(date)) throw new UserError('Data inválida.');
  if (monthOfDate(date) !== month) throw new UserError('A data precisa estar dentro do mês selecionado.');
}

function requireMonth(db: Db, month: string): void {
  if (!monthExists(db, month)) throw new UserError('Este mês não existe.');
}

/** Meses existentes a partir de `month` (inclusive). */
function monthsFrom(db: Db, month: string): string[] {
  return listMonths(db).filter((m) => m >= month);
}

/* ---------------- Entradas ---------------- */

/** `today` no formato YYYY-MM-DD: a data da entrada pode ser hoje ou futura. */
export function addIncome(db: Db, month: string, input: IncomeInput, today: string): number {
  validateCommon(input, INCOME_TYPES, month, input.date);
  if (input.date < today) throw new UserError('A data prevista deve ser hoje ou uma data futura.');
  const name = input.name.trim();
  const note = cleanNote(input.note);

  return transaction(db, () => {
    requireMonth(db, month);
    if (input.recurrence === 'mes') {
      return db.run(
        `INSERT INTO incomes (month, series_id, recurrence, type, name, amount_cents, date, received, note)
         VALUES (?, NULL, 'mes', ?, ?, ?, ?, 0, ?)`,
        [month, input.type, name, input.amountCents, input.date, note],
      ).lastInsertRowId;
    }
    // Fixa: cria a série e lança neste mês e nos seguintes que já existirem.
    const day = dayOf(input.date);
    const seriesId = db.run(
      `INSERT INTO series (kind, type, name, amount_cents, day, note, start_month, end_month)
       VALUES ('income', ?, ?, ?, ?, ?, ?, NULL)`,
      [input.type, name, input.amountCents, day, note, month],
    ).lastInsertRowId;
    let id = 0;
    for (const m of monthsFrom(db, month)) {
      const r = db.run(
        `INSERT INTO incomes (month, series_id, recurrence, type, name, amount_cents, date, received, note)
         VALUES (?, ?, 'fixa', ?, ?, ?, ?, 0, ?)`,
        [m, seriesId, input.type, name, input.amountCents, m === month ? input.date : dateInMonth(m, day), note],
      );
      if (m === month) id = r.lastInsertRowId;
    }
    return id;
  });
}

/**
 * Edita uma entrada. A recorrência (fixa/do mês) não muda na edição.
 * Para entradas fixas, `scope` define se vale só para este mês ou também para os próximos.
 */
export function updateIncome(
  db: Db,
  id: number,
  input: Omit<IncomeInput, 'recurrence'>,
  scope: EditScope,
  today: string,
): void {
  transaction(db, () => {
    const cur = getIncome(db, id);
    if (!cur) throw new UserError('Entrada não encontrada.');
    validateCommon(input, INCOME_TYPES, cur.month, input.date);
    if (input.date !== cur.date && input.date < today) {
      throw new UserError('A data prevista deve ser hoje ou uma data futura.');
    }
    const name = input.name.trim();
    const note = cleanNote(input.note);
    db.run('UPDATE incomes SET type = ?, name = ?, amount_cents = ?, date = ?, note = ? WHERE id = ?', [
      input.type, name, input.amountCents, input.date, note, id,
    ]);
    if (scope === 'this_and_next' && cur.seriesId != null) {
      const day = dayOf(input.date);
      db.run('UPDATE series SET type = ?, name = ?, amount_cents = ?, day = ?, note = ? WHERE id = ?', [
        input.type, name, input.amountCents, day, note, cur.seriesId,
      ]);
      for (const m of monthsFrom(db, addMonths(cur.month, 1))) {
        db.run(
          `UPDATE incomes SET type = ?, name = ?, amount_cents = ?, date = ?, note = ?
            WHERE month = ? AND series_id = ?`,
          [input.type, name, input.amountCents, dateInMonth(m, day), note, m, cur.seriesId],
        );
      }
    }
  });
}

export function deleteIncome(db: Db, id: number, scope: EditScope): void {
  transaction(db, () => {
    const cur = getIncome(db, id);
    if (!cur) return;
    if (scope === 'this_and_next' && cur.seriesId != null) {
      db.run('UPDATE series SET end_month = ? WHERE id = ?', [addMonths(cur.month, -1), cur.seriesId]);
      db.run('DELETE FROM incomes WHERE series_id = ? AND month >= ?', [cur.seriesId, cur.month]);
    } else {
      db.run('DELETE FROM incomes WHERE id = ?', [id]);
    }
  });
}

export function toggleIncomeReceived(db: Db, id: number): void {
  db.run('UPDATE incomes SET received = 1 - received WHERE id = ?', [id]);
}

/* ---------------- Gastos fixos ---------------- */

export function addFixedExpense(db: Db, month: string, input: FixedExpenseInput): number {
  validateCommon(input, EXPENSE_TYPES, month, input.dueDate);
  const name = input.name.trim();
  const note = cleanNote(input.note);
  return transaction(db, () => {
    requireMonth(db, month);
    const day = dayOf(input.dueDate);
    const seriesId = db.run(
      `INSERT INTO series (kind, type, name, amount_cents, day, note, start_month, end_month)
       VALUES ('fixed_expense', ?, ?, ?, ?, ?, ?, NULL)`,
      [input.type, name, input.amountCents, day, note, month],
    ).lastInsertRowId;
    let id = 0;
    for (const m of monthsFrom(db, month)) {
      const r = db.run(
        `INSERT INTO fixed_expenses (month, series_id, type, name, amount_cents, due_date, paid, note)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
        [m, seriesId, input.type, name, input.amountCents, m === month ? input.dueDate : dateInMonth(m, day), note],
      );
      if (m === month) id = r.lastInsertRowId;
    }
    return id;
  });
}

export function updateFixedExpense(db: Db, id: number, input: FixedExpenseInput, scope: EditScope): void {
  transaction(db, () => {
    const cur = getFixedExpense(db, id);
    if (!cur) throw new UserError('Gasto não encontrado.');
    validateCommon(input, EXPENSE_TYPES, cur.month, input.dueDate);
    const name = input.name.trim();
    const note = cleanNote(input.note);
    db.run(
      'UPDATE fixed_expenses SET type = ?, name = ?, amount_cents = ?, due_date = ?, note = ? WHERE id = ?',
      [input.type, name, input.amountCents, input.dueDate, note, id],
    );
    if (scope === 'this_and_next') {
      const day = dayOf(input.dueDate);
      db.run('UPDATE series SET type = ?, name = ?, amount_cents = ?, day = ?, note = ? WHERE id = ?', [
        input.type, name, input.amountCents, day, note, cur.seriesId,
      ]);
      for (const m of monthsFrom(db, addMonths(cur.month, 1))) {
        db.run(
          `UPDATE fixed_expenses SET type = ?, name = ?, amount_cents = ?, due_date = ?, note = ?
            WHERE month = ? AND series_id = ?`,
          [input.type, name, input.amountCents, dateInMonth(m, day), note, m, cur.seriesId],
        );
      }
    }
  });
}

export function deleteFixedExpense(db: Db, id: number, scope: EditScope): void {
  transaction(db, () => {
    const cur = getFixedExpense(db, id);
    if (!cur) return;
    if (scope === 'this_and_next') {
      db.run('UPDATE series SET end_month = ? WHERE id = ?', [addMonths(cur.month, -1), cur.seriesId]);
      db.run('DELETE FROM fixed_expenses WHERE series_id = ? AND month >= ?', [cur.seriesId, cur.month]);
    } else {
      db.run('DELETE FROM fixed_expenses WHERE id = ?', [id]);
    }
  });
}

export function toggleFixedExpensePaid(db: Db, id: number): void {
  db.run('UPDATE fixed_expenses SET paid = 1 - paid WHERE id = ?', [id]);
}

/* ---------------- Gastos variáveis ---------------- */

function validateVariable(input: VariableExpenseInput, month: string): void {
  validateCommon(input, EXPENSE_TYPES, month, input.dueDate);
  if (!PAYMENT_METHOD_KEYS.includes(input.paymentMethod)) {
    throw new UserError('Selecione a forma de pagamento.');
  }
}

export function addVariableExpense(db: Db, month: string, input: VariableExpenseInput): number {
  validateVariable(input, month);
  const name = input.name.trim();
  const note = cleanNote(input.note);
  return transaction(db, () => {
    requireMonth(db, month);
    if (input.paymentMethod === 'credito') {
      const purchaseId = createCreditPurchase(db, {
        type: input.type,
        name,
        totalCents: input.amountCents,
        installments: input.installments ?? 1,
        firstMonth: month,
        dueDay: dayOf(input.dueDate),
        note,
      });
      const first = db.first<{ id: number }>(
        'SELECT id FROM variable_expenses WHERE purchase_id = ? AND installment_no = 1',
        [purchaseId],
      );
      return first!.id;
    }
    return db.run(
      `INSERT INTO variable_expenses
         (month, type, name, amount_cents, due_date, paid, note, payment_method, purchase_id, installment_no)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?, NULL, NULL)`,
      [month, input.type, name, input.amountCents, input.dueDate, note, input.paymentMethod],
    ).lastInsertRowId;
  });
}

/**
 * Edita um gasto variável.
 * - Sem parcelamento: altera só o item.
 * - Parcela de cartão: nome/tipo/observação valem para a compra toda; vencimento
 *   vale deste mês em diante; total e quantidade de parcelas recalculam
 *   as parcelas deste mês em diante (pagas nunca mudam).
 * A forma de pagamento de uma compra parcelada não pode ser trocada.
 */
export function updateVariableExpense(db: Db, id: number, input: VariableExpenseInput): void {
  transaction(db, () => {
    const cur = getVariableExpense(db, id);
    if (!cur) throw new UserError('Gasto não encontrado.');
    validateVariable(input, cur.month);
    const name = input.name.trim();
    const note = cleanNote(input.note);

    if (cur.purchaseId == null) {
      if (input.paymentMethod === 'credito') {
        throw new UserError('Para parcelar no crédito, exclua este gasto e cadastre uma nova compra no crédito.');
      }
      db.run(
        `UPDATE variable_expenses SET type = ?, name = ?, amount_cents = ?, due_date = ?, note = ?, payment_method = ?
          WHERE id = ?`,
        [input.type, name, input.amountCents, input.dueDate, note, input.paymentMethod, id],
      );
      return;
    }

    if (input.paymentMethod !== 'credito') {
      throw new UserError('Não é possível trocar a forma de pagamento de uma compra parcelada.');
    }
    const p = getCreditPurchase(db, cur.purchaseId)!;
    const day = dayOf(input.dueDate);
    db.run('UPDATE credit_purchases SET type = ?, name = ?, note = ?, due_day = ? WHERE id = ?', [
      input.type, name, note, day, p.id,
    ]);
    db.run('UPDATE variable_expenses SET type = ?, name = ?, note = ? WHERE purchase_id = ?', [
      input.type, name, note, p.id,
    ]);
    const later = db.all<{ id: number; month: string }>(
      'SELECT id, month FROM variable_expenses WHERE purchase_id = ? AND month >= ?',
      [p.id, cur.month],
    );
    for (const r of later) {
      db.run('UPDATE variable_expenses SET due_date = ? WHERE id = ?', [dateInMonth(r.month, day), r.id]);
    }
    const newCount = input.installments ?? p.installments;
    if (newCount !== p.installments || input.amountCents !== p.totalCents) {
      recalcCreditPurchase(db, p.id, cur.month, { totalCents: input.amountCents, installments: newCount });
    }
  });
}

/** Exclui o gasto. Para parcela de cartão, exclui a compra inteira com todas as parcelas. */
export function deleteVariableExpense(db: Db, id: number): void {
  transaction(db, () => {
    const cur = getVariableExpense(db, id);
    if (!cur) return;
    if (cur.purchaseId != null) {
      db.run('DELETE FROM variable_expenses WHERE purchase_id = ?', [cur.purchaseId]);
      db.run('DELETE FROM credit_purchases WHERE id = ?', [cur.purchaseId]);
    } else {
      db.run('DELETE FROM variable_expenses WHERE id = ?', [id]);
    }
  });
}

export function toggleVariableExpensePaid(db: Db, id: number): void {
  db.run('UPDATE variable_expenses SET paid = 1 - paid WHERE id = ?', [id]);
}
