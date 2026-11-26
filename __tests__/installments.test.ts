import { splitAmounts, splitCents, recalcCreditPurchase } from '../src/domain/installments';
import { addVariableExpense, toggleVariableExpensePaid, updateVariableExpense } from '../src/domain/items';
import { createMonth } from '../src/domain/months';
import { listVariableExpenses, displayName, getCreditPurchase } from '../src/domain/repo';
import { addMonths } from '../src/dates';
import { at, freshDb } from './helpers/fixtures';
import type { Db } from '../src/db/adapter';

const rowsOf = (db: Db, purchaseId: number) =>
  db.all<{ id: number; month: string; installment_no: number; amount_cents: number; paid: number }>(
    'SELECT id, month, installment_no, amount_cents, paid FROM variable_expenses WHERE purchase_id = ? ORDER BY installment_no',
    [purchaseId],
  );

const purchaseIdOf = (db: Db, itemId: number) =>
  db.first<{ purchase_id: number }>('SELECT purchase_id FROM variable_expenses WHERE id = ?', [itemId])!.purchase_id;

/** Cria os meses seguintes até `last` (confirmando a remoção do mais antigo quando passar de 12). */
function createMonthsUntil(db: Db, last: string, onCreated?: (month: string) => void) {
  let m = addMonths(db.first<{ id: string }>('SELECT MAX(id) AS id FROM months')!.id, 1);
  while (m <= last) {
    createMonth(db, m, 'manual', { now: at(2026, 11, 1), confirmRemoval: true });
    onCreated?.(m);
    m = addMonths(m, 1);
  }
}

describe('divisão de parcelas com centavos', () => {
  test('resto vai para a última parcela', () => {
    expect(splitAmounts(10000, 3)).toEqual([3333, 3333, 3334]);
    expect(splitAmounts(5, 3)).toEqual([1, 1, 3]);
    expect(splitAmounts(100, 1)).toEqual([100]);
    expect(splitAmounts(99999, 10)).toEqual([9999, 9999, 9999, 9999, 9999, 9999, 9999, 9999, 9999, 10008]);
  });

  test('a soma sempre fecha o total e tudo é inteiro', () => {
    for (const total of [1, 7, 100, 9999, 123457, 1000000]) {
      for (let n = 1; n <= 24; n++) {
        const parts = splitAmounts(total, n);
        expect(parts.reduce((a, b) => a + b, 0)).toBe(total);
        expect(parts.every(Number.isInteger)).toBe(true);
      }
    }
    expect(splitCents(10000, 3)).toEqual({ installmentCents: 3333, lastInstallmentCents: 3334 });
  });

  test('parcelas aparecem nos meses certos com rótulo "Nome (k/N)", incluindo meses criados depois', () => {
    const db = freshDb('2026-11');
    addVariableExpense(db, '2026-11', {
      type: 'Lazer', name: 'TV', amountCents: 10000, dueDate: '2026-11-15', note: null, paymentMethod: 'credito', installments: 3,
    });
    expect(listVariableExpenses(db, '2026-11').map(displayName)).toEqual(['TV (1/3)']);

    createMonthsUntil(db, '2027-02');
    expect(listVariableExpenses(db, '2026-12').map(displayName)).toEqual(['TV (2/3)']);
    expect(listVariableExpenses(db, '2027-01').map(displayName)).toEqual(['TV (3/3)']);
    expect(listVariableExpenses(db, '2027-02')).toEqual([]);

    const amounts = ['2026-11', '2026-12', '2027-01'].map((m) => listVariableExpenses(db, m)[0].amountCents);
    expect(amounts).toEqual([3333, 3333, 3334]);
    expect(listVariableExpenses(db, '2027-01')[0].dueDate).toBe('2027-01-15');
    db.close();
  });

  test('compra lançada em mês anterior quando os meses seguintes já existem', () => {
    const db = freshDb('2026-11');
    createMonthsUntil(db, '2027-01');
    const id = addVariableExpense(db, '2026-11', {
      type: 'Lazer', name: 'Sofá', amountCents: 100000, dueDate: '2026-11-05', note: null, paymentMethod: 'credito', installments: 4,
    });
    const rows = rowsOf(db, purchaseIdOf(db, id));
    expect(rows.map((r) => r.month)).toEqual(['2026-11', '2026-12', '2027-01']);
    db.close();
  });
});

describe('edição da quantidade de parcelas', () => {
  function setup() {
    const db = freshDb('2026-11');
    createMonthsUntil(db, '2027-03'); // 5 meses: nov..mar
    const id = addVariableExpense(db, '2026-11', {
      type: 'Vestuário', name: 'Casaco', amountCents: 100000, dueDate: '2026-11-10', note: null,
      paymentMethod: 'credito', installments: 10,
    });
    return { db, firstId: id, pid: purchaseIdOf(db, id) };
  }

  test('aumentar parcelas no mês atual: pagas intactas, resto redistribuído, soma fecha', () => {
    const { db, pid } = setup();
    const rows = rowsOf(db, pid);
    expect(rows).toHaveLength(5);
    // paga as duas primeiras
    toggleVariableExpensePaid(db, rows[0].id);
    toggleVariableExpensePaid(db, rows[1].id);

    // usuário está em jan/2027 (parcela 3) e muda para 20x
    recalcCreditPurchase(db, pid, '2027-01', { totalCents: 100000, installments: 20 });

    const after = rowsOf(db, pid);
    expect(after[0]).toMatchObject({ amount_cents: 10000, paid: 1 });
    expect(after[1]).toMatchObject({ amount_cents: 10000, paid: 1 });
    // 80000 restantes em 18 parcelas: 4444 cada, última 4452
    expect(after.slice(2).map((r) => r.amount_cents)).toEqual([4444, 4444, 4444]);
    expect(after.slice(2).every((r) => r.paid === 0)).toBe(true);
    const p = getCreditPurchase(db, pid)!;
    expect(p).toMatchObject({ installments: 20, installmentCents: 4444, lastInstallmentCents: 4452 });

    // Meses futuros recebem as parcelas pelo novo plano. Passa de 12 meses, então
    // meses antigos são removidos (com confirmação) — a última parcela continua certa.
    const seen = new Map<number, number>();
    const observe = () => rowsOf(db, pid).forEach((r) => seen.set(r.installment_no, r.amount_cents));
    observe();
    createMonthsUntil(db, '2028-07', observe);
    expect([...seen.keys()].sort((a, b) => a - b)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    expect([...seen.values()].reduce((a, b) => a + b, 0)).toBe(100000);
    expect(seen.get(20)).toBe(4452);
    expect(db.first<{ n: number }>('SELECT COUNT(*) AS n FROM months')!.n).toBe(12);
    db.close();
  });

  test('reduzir parcelas remove as que sobram e nunca altera as pagas', () => {
    const { db, pid } = setup();
    const rows = rowsOf(db, pid);
    toggleVariableExpensePaid(db, rows[0].id);
    toggleVariableExpensePaid(db, rows[3].id); // parcela 4 (fev) paga antecipadamente

    recalcCreditPurchase(db, pid, '2026-12', { totalCents: 100000, installments: 4 });

    const after = rowsOf(db, pid);
    expect(after.map((r) => r.installment_no)).toEqual([1, 2, 3, 4]); // a 5 (mar) foi removida
    expect(after[0]).toMatchObject({ amount_cents: 10000, paid: 1 });
    expect(after[3]).toMatchObject({ amount_cents: 10000, paid: 1 });
    // em aberto: 100000 - 20000 = 80000 em 2 parcelas (2 e 3)
    expect([after[1].amount_cents, after[2].amount_cents]).toEqual([40000, 40000]);
    expect(after.reduce((a, r) => a + r.amount_cents, 0)).toBe(100000);
    expect(listVariableExpenses(db, '2027-03')).toEqual([]);
    db.close();
  });

  test('não permite reduzir abaixo de uma parcela já paga', () => {
    const { db, pid } = setup();
    const rows = rowsOf(db, pid);
    toggleVariableExpensePaid(db, rows[4].id); // parcela 5 paga
    const before = rowsOf(db, pid);
    expect(() => recalcCreditPurchase(db, pid, '2026-11', { totalCents: 100000, installments: 3 })).toThrow(/menos de 5/);
    expect(rowsOf(db, pid)).toEqual(before); // nada mudou
    db.close();
  });

  test('recálculo pela tela de edição (updateVariableExpense) com soma exata', () => {
    const { db, pid } = setup();
    const rows = rowsOf(db, pid);
    toggleVariableExpensePaid(db, rows[0].id);
    updateVariableExpense(db, rows[1].id, {
      type: 'Vestuário', name: 'Casaco', amountCents: 100000, dueDate: '2026-12-10', note: null,
      paymentMethod: 'credito', installments: 7,
    });
    createMonthsUntil(db, '2027-06');
    const all = rowsOf(db, pid);
    expect(all).toHaveLength(7);
    expect(all.reduce((a, r) => a + r.amount_cents, 0)).toBe(100000);
    expect(all[0].amount_cents).toBe(10000);
    // 90000 / 6 = 15000
    expect(all.slice(1).map((r) => r.amount_cents)).toEqual([15000, 15000, 15000, 15000, 15000, 15000]);
    db.close();
  });
});
