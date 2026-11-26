import {
  addFixedExpense,
  addIncome,
  addVariableExpense,
  toggleFixedExpensePaid,
  toggleIncomeReceived,
  toggleVariableExpensePaid,
  updateVariableExpense,
} from '../src/domain/items';
import { createMonth, runAutoCreate } from '../src/domain/months';
import { recalcCreditPurchase } from '../src/domain/installments';
import { listFixedExpenses, listIncomes, listVariableExpenses } from '../src/domain/repo';
import { at, freshDb, statuses, TODAY } from './helpers/fixtures';
import type { Db } from '../src/db/adapter';

const allZero = (xs: number[]) => xs.length > 0 && xs.every((x) => x === 0);

function seed(db: Db, month = '2026-11') {
  addIncome(db, month, { type: 'Salário', name: 'Salário', amountCents: 500000, date: `${month}-05`, recurrence: 'fixa', note: null }, TODAY);
  addIncome(db, month, { type: 'Reembolso', name: 'Reembolso', amountCents: 10000, date: `${month}-06`, recurrence: 'mes', note: null }, TODAY);
  addFixedExpense(db, month, { type: 'Contas de casa', name: 'Luz', amountCents: 20000, dueDate: `${month}-10`, note: null });
  addVariableExpense(db, month, { type: 'Transporte', name: 'Uber', amountCents: 3500, dueDate: `${month}-11`, note: null, paymentMethod: 'pix' });
  addVariableExpense(db, month, { type: 'Saúde', name: 'Dentista', amountCents: 90000, dueDate: `${month}-12`, note: null, paymentMethod: 'credito', installments: 3 });
}

/** Marca TODOS os itens do mês como pagos/recebidos. */
function markAllDone(db: Db, month: string) {
  listIncomes(db, month).forEach((i) => !i.received && toggleIncomeReceived(db, i.id));
  listFixedExpenses(db, month).forEach((f) => !f.paid && toggleFixedExpensePaid(db, f.id));
  listVariableExpenses(db, month).forEach((v) => !v.paid && toggleVariableExpensePaid(db, v.id));
}

function monthStatuses(db: Db, month: string) {
  return [
    ...listIncomes(db, month).map((i) => i.received),
    ...listFixedExpenses(db, month).map((f) => f.paid),
    ...listVariableExpenses(db, month).map((v) => v.paid),
  ];
}

describe('todo item nasce pendente', () => {
  test('cadastro manual: entradas "não recebida" e gastos "não pago" (inclui cada parcela)', () => {
    const db = freshDb();
    seed(db);
    const s = statuses(db);
    expect(allZero(s.incomes)).toBe(true);
    expect(allZero(s.fixed)).toBe(true);
    expect(allZero(s.variable)).toBe(true);
    expect(s.incomes).toHaveLength(2);
    expect(s.variable).toHaveLength(2); // Uber + parcela 1/3
    db.close();
  });

  test('mês criado manualmente a partir de um mês todo pago/recebido', () => {
    const db = freshDb();
    seed(db);
    markAllDone(db, '2026-11');
    expect(monthStatuses(db, '2026-11').every(Boolean)).toBe(true);

    createMonth(db, '2026-12', 'manual', { now: at(2026, 11, 5) });
    const dec = monthStatuses(db, '2026-12');
    expect(dec.length).toBe(3); // salário fixo, luz, parcela 2/3
    expect(dec.every((x) => x === false)).toBe(true);
    // o mês de origem continua todo pago
    expect(monthStatuses(db, '2026-11').every(Boolean)).toBe(true);
    db.close();
  });

  test('mês criado automaticamente (dia 20) a partir de um mês todo pago/recebido', () => {
    const db = freshDb();
    seed(db);
    markAllDone(db, '2026-11');
    expect(runAutoCreate(db, at(2026, 11, 20))).toMatchObject({ status: 'created', month: '2026-12' });
    const dec = monthStatuses(db, '2026-12');
    expect(dec.length).toBe(3);
    expect(dec.every((x) => x === false)).toBe(true);
    db.close();
  });

  test('itens adicionados em mês com meses seguintes já criados nascem pendentes em todos eles', () => {
    const db = freshDb();
    createMonth(db, '2026-12', 'manual', { now: at(2026, 11, 5) });
    seed(db, '2026-11');
    expect(allZero(statuses(db).incomes)).toBe(true);
    expect(allZero(statuses(db).fixed)).toBe(true);
    expect(allZero(statuses(db).variable)).toBe(true);
    db.close();
  });

  test('parcelas geradas e recalculadas nascem pendentes', () => {
    const db = freshDb();
    const id = addVariableExpense(db, '2026-11', {
      type: 'Viagem', name: 'Passagem', amountCents: 120000, dueDate: '2026-11-08', note: null, paymentMethod: 'credito', installments: 4,
    });
    const pid = db.first<{ purchase_id: number }>('SELECT purchase_id FROM variable_expenses WHERE id = ?', [id])!.purchase_id;
    toggleVariableExpensePaid(db, id); // paga a 1ª

    // gerada na criação dos meses
    createMonth(db, '2026-12', 'manual', { now: at(2026, 11, 5) });
    createMonth(db, '2027-01', 'manual', { now: at(2026, 11, 5) });
    const generated = db.all<{ paid: number }>('SELECT paid FROM variable_expenses WHERE purchase_id = ? AND installment_no > 1', [pid]);
    expect(generated.map((r) => r.paid)).toEqual([0, 0]);

    // marca a 2ª como paga e recalcula para 8x a partir de jan: novas parcelas pendentes
    const second = db.first<{ id: number }>('SELECT id FROM variable_expenses WHERE purchase_id = ? AND installment_no = 2', [pid])!;
    toggleVariableExpensePaid(db, second.id);
    recalcCreditPurchase(db, pid, '2027-01', { totalCents: 120000, installments: 8 });
    createMonth(db, '2027-02', 'manual', { now: at(2026, 11, 5) });
    createMonth(db, '2027-03', 'manual', { now: at(2026, 11, 5) });

    const rows = db.all<{ installment_no: number; paid: number }>(
      'SELECT installment_no, paid FROM variable_expenses WHERE purchase_id = ? ORDER BY installment_no', [pid]);
    expect(rows).toEqual([
      { installment_no: 1, paid: 1 },
      { installment_no: 2, paid: 1 },
      { installment_no: 3, paid: 0 },
      { installment_no: 4, paid: 0 },
      { installment_no: 5, paid: 0 },
    ]);

    // recálculo pela edição (reduzir) também não marca nada como pago
    const jan = db.first<{ id: number }>('SELECT id FROM variable_expenses WHERE purchase_id = ? AND installment_no = 3', [pid])!;
    updateVariableExpense(db, jan.id, {
      type: 'Viagem', name: 'Passagem', amountCents: 120000, dueDate: '2027-01-08', note: null, paymentMethod: 'credito', installments: 4,
    });
    const after = db.all<{ installment_no: number; paid: number }>(
      'SELECT installment_no, paid FROM variable_expenses WHERE purchase_id = ? ORDER BY installment_no', [pid]);
    expect(after).toEqual([
      { installment_no: 1, paid: 1 },
      { installment_no: 2, paid: 1 },
      { installment_no: 3, paid: 0 },
      { installment_no: 4, paid: 0 },
    ]);
    db.close();
  });
});
