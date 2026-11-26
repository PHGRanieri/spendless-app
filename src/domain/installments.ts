import { Db, transaction } from '../db/adapter';
import { addMonths, dateInMonth, monthDiff } from '../dates';
import { getCreditPurchase, monthExists, toVariableExpense } from './repo';
import { CreditPurchase, UserError } from './types';

/**
 * Divide um valor em parcelas inteiras de centavos.
 * Cada parcela = floor(total / n); o resto da divisão vai para a última.
 * Ex.: 10000 / 3 -> [3333, 3333, 3334].
 */
export function splitCents(totalCents: number, n: number): {
  installmentCents: number;
  lastInstallmentCents: number;
} {
  if (!Number.isSafeInteger(totalCents) || totalCents < 0) throw new Error('Total inválido');
  if (!Number.isInteger(n) || n < 1) throw new Error('Quantidade de parcelas inválida');
  const installmentCents = Math.floor(totalCents / n);
  return { installmentCents, lastInstallmentCents: totalCents - installmentCents * (n - 1) };
}

export function splitAmounts(totalCents: number, n: number): number[] {
  const { installmentCents, lastInstallmentCents } = splitCents(totalCents, n);
  return Array.from({ length: n }, (_, i) => (i === n - 1 ? lastInstallmentCents : installmentCents));
}

/** Mês em que cai a parcela k (1-based). */
export function slotMonth(p: Pick<CreditPurchase, 'firstMonth'>, k: number): string {
  return addMonths(p.firstMonth, k - 1);
}

/** Número da parcela que cai no mês, ou null se a compra não tem parcela nele. */
export function slotForMonth(
  p: Pick<CreditPurchase, 'firstMonth' | 'installments'>,
  month: string,
): number | null {
  const k = monthDiff(p.firstMonth, month) + 1;
  return k >= 1 && k <= p.installments ? k : null;
}

/** Valor planejado da parcela k ainda não lançada. */
export function plannedAmount(p: CreditPurchase, k: number): number {
  return k === p.installments ? p.lastInstallmentCents : p.installmentCents;
}

/**
 * Lança (se ainda não existir) a parcela da compra que cai em `month`.
 * Sempre nasce como "não paga". Idempotente graças a UNIQUE(purchase_id, installment_no).
 */
export function insertInstallmentForMonth(db: Db, p: CreditPurchase, month: string): void {
  const k = slotForMonth(p, month);
  if (k == null) return;
  db.run(
    `INSERT OR IGNORE INTO variable_expenses
       (month, type, name, amount_cents, due_date, paid, note, payment_method, purchase_id, installment_no)
     VALUES (?, ?, ?, ?, ?, 0, ?, 'credito', ?, ?)`,
    [month, p.type, p.name, plannedAmount(p, k), dateInMonth(month, p.dueDay), p.note, p.id, k],
  );
}

export interface NewPurchase {
  type: string;
  name: string;
  totalCents: number;
  installments: number;
  firstMonth: string;
  dueDay: number;
  note: string | null;
}

/**
 * Cria a compra no crédito e lança as parcelas nos meses que já existem.
 * As demais entram quando os respectivos meses forem criados.
 */
export function createCreditPurchase(db: Db, input: NewPurchase): number {
  validateInstallmentCount(input.installments);
  if (input.totalCents <= 0) throw new UserError('Informe o valor total da compra.');
  const { installmentCents, lastInstallmentCents } = splitCents(input.totalCents, input.installments);
  return transaction(db, () => {
    const { lastInsertRowId: id } = db.run(
      `INSERT INTO credit_purchases
         (type, name, total_cents, installments, first_month, due_day, note, installment_cents, last_installment_cents)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.type, input.name, input.totalCents, input.installments, input.firstMonth,
        input.dueDay, input.note, installmentCents, lastInstallmentCents,
      ],
    );
    const p = getCreditPurchase(db, id)!;
    for (let k = 1; k <= p.installments; k++) {
      const m = slotMonth(p, k);
      if (monthExists(db, m)) insertInstallmentForMonth(db, p, m);
    }
    return id;
  });
}

export function validateInstallmentCount(n: number): void {
  if (!Number.isInteger(n) || n < 1 || n > 120) {
    throw new UserError('A quantidade de parcelas deve ser um número inteiro entre 1 e 120.');
  }
}

/**
 * Recalcula as parcelas a partir de `fromMonth` (o mês em que o usuário editou)
 * para um novo total e/ou quantidade de parcelas.
 *
 * - Parcelas pagas e parcelas de meses anteriores a `fromMonth` nunca mudam.
 * - O valor ainda em aberto é redistribuído entre as parcelas restantes
 *   (floor para cada uma, resto na última).
 * - Parcelas que sobrarem são removidas; as que faltarem são lançadas
 *   (pendentes) nos meses que já existem.
 * Tudo em UMA transação.
 */
export function recalcCreditPurchase(
  db: Db,
  purchaseId: number,
  fromMonth: string,
  change: { totalCents: number; installments: number },
): void {
  validateInstallmentCount(change.installments);
  if (!Number.isSafeInteger(change.totalCents) || change.totalCents <= 0) {
    throw new UserError('Informe o valor total da compra.');
  }

  transaction(db, () => {
    const p = getCreditPurchase(db, purchaseId);
    if (!p) throw new UserError('Compra não encontrada.');
    const rows = db
      .all<Record<string, unknown>>('SELECT * FROM variable_expenses WHERE purchase_id = ?', [p.id])
      .map(toVariableExpense);
    const byNo = new Map(rows.map((r) => [r.installmentNo!, r]));

    const isIntact = (k: number): boolean => {
      const row = byNo.get(k);
      if (row) return row.paid || row.month < fromMonth;
      return slotMonth(p, k) < fromMonth;
    };

    // Quanto do plano atual ainda está em aberto (não pago, deste mês em diante).
    let openCents = 0;
    for (let k = 1; k <= p.installments; k++) {
      if (isIntact(k)) continue;
      const row = byNo.get(k);
      openCents += row ? row.amountCents : plannedAmount(p, k);
    }
    const remaining = openCents + (change.totalCents - p.totalCents);

    const highestIntact = Math.max(0, ...rows.filter((r) => isIntact(r.installmentNo!)).map((r) => r.installmentNo!));
    if (change.installments < highestIntact) {
      throw new UserError(
        `Não é possível ter menos de ${highestIntact} parcelas: a parcela ${highestIntact} já está paga ou é de um mês anterior.`,
      );
    }
    if (remaining < 0) {
      throw new UserError('O novo total é menor do que o valor das parcelas já pagas.');
    }

    const slots: number[] = [];
    for (let k = 1; k <= change.installments; k++) if (!isIntact(k)) slots.push(k);

    let installmentCents = p.installmentCents;
    let lastInstallmentCents = p.lastInstallmentCents;
    if (slots.length === 0) {
      if (remaining !== 0) {
        throw new UserError('Não há parcelas em aberto para absorver a diferença do novo total.');
      }
    } else {
      installmentCents = Math.floor(remaining / slots.length);
      lastInstallmentCents = remaining - installmentCents * (slots.length - 1);
    }

    // Remove parcelas excedentes (só as não pagas deste mês em diante).
    for (const r of rows) {
      if (r.installmentNo! > change.installments && !isIntact(r.installmentNo!)) {
        db.run('DELETE FROM variable_expenses WHERE id = ?', [r.id]);
      }
    }

    db.run(
      `UPDATE credit_purchases
          SET total_cents = ?, installments = ?, installment_cents = ?, last_installment_cents = ?
        WHERE id = ?`,
      [change.totalCents, change.installments, installmentCents, lastInstallmentCents, p.id],
    );
    const updated = getCreditPurchase(db, p.id)!;

    const lastSlot = slots[slots.length - 1];
    for (const k of slots) {
      const amount = k === lastSlot ? lastInstallmentCents : installmentCents;
      const row = byNo.get(k);
      if (row) {
        // Só o valor muda; o status (não pago) é preservado.
        db.run('UPDATE variable_expenses SET amount_cents = ? WHERE id = ?', [amount, row.id]);
      } else {
        const m = slotMonth(updated, k);
        if (monthExists(db, m)) {
          db.run(
            `INSERT INTO variable_expenses
               (month, type, name, amount_cents, due_date, paid, note, payment_method, purchase_id, installment_no)
             VALUES (?, ?, ?, ?, ?, 0, ?, 'credito', ?, ?)`,
            [m, updated.type, updated.name, amount, dateInMonth(m, updated.dueDay), updated.note, updated.id, k],
          );
        }
      }
    }
  });
}
