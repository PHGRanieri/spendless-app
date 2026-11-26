import { computeSummary, loadMonthSummary } from '../src/domain/summary';
import {
  addFixedExpense,
  addIncome,
  addVariableExpense,
  toggleFixedExpensePaid,
  toggleIncomeReceived,
} from '../src/domain/items';
import { freshDb, TODAY } from './helpers/fixtures';

describe('saldo atual e saldo previsto', () => {
  test('cálculo puro', () => {
    const s = computeSummary(
      [
        { amountCents: 500000, received: true },
        { amountCents: 120050, received: false },
      ],
      [
        { type: 'Mercado', amountCents: 80000, paid: true },
        { type: 'Contas de casa', amountCents: 150025, paid: false },
        { type: 'Mercado', amountCents: 19999, paid: false },
      ],
    );
    expect(s.incomesReceived).toBe(500000);
    expect(s.incomesExpected).toBe(620050);
    expect(s.expensesPaid).toBe(80000);
    expect(s.expensesExpected).toBe(250024);
    expect(s.balanceNow).toBe(500000 - 80000);
    expect(s.balanceForecast).toBe(620050 - 250024);
    expect(s.byType.map((t) => [t.type, t.cents])).toEqual([
      ['Contas de casa', 150025],
      ['Mercado', 99999],
    ]);
    for (const v of [s.incomesReceived, s.incomesExpected, s.expensesPaid, s.expensesExpected, s.balanceNow, s.balanceForecast]) {
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  test('mês vazio e saldo negativo', () => {
    expect(computeSummary([], []).balanceForecast).toBe(0);
    const s = computeSummary([{ amountCents: 100, received: false }], [{ type: 'Lazer', amountCents: 300, paid: true }]);
    expect(s.balanceNow).toBe(-300);
    expect(s.balanceForecast).toBe(-200);
  });

  test('a partir do banco (entradas, fixos e variáveis)', () => {
    const db = freshDb();
    const inc = addIncome(db, '2026-11', { type: 'Salário', name: 'Salário', amountCents: 1000000, date: '2026-11-05', recurrence: 'fixa', note: null }, TODAY);
    addIncome(db, '2026-11', { type: 'Freelance', name: 'Site', amountCents: 250000, date: '2026-11-20', recurrence: 'mes', note: null }, TODAY);
    const fx = addFixedExpense(db, '2026-11', { type: 'Contas de casa', name: 'Aluguel', amountCents: 300000, dueDate: '2026-11-10', note: null });
    addVariableExpense(db, '2026-11', { type: 'Mercado', name: 'Feira', amountCents: 15075, dueDate: '2026-11-12', note: null, paymentMethod: 'pix' });
    addVariableExpense(db, '2026-11', { type: 'Lazer', name: 'TV', amountCents: 100000, dueDate: '2026-11-15', note: null, paymentMethod: 'credito', installments: 3 });
    toggleIncomeReceived(db, inc);
    toggleFixedExpensePaid(db, fx);

    const s = loadMonthSummary(db, '2026-11');
    expect(s.incomesReceived).toBe(1000000);
    expect(s.incomesExpected).toBe(1250000);
    expect(s.expensesPaid).toBe(300000);
    expect(s.expensesExpected).toBe(300000 + 15075 + 33333);
    expect(s.balanceNow).toBe(700000);
    expect(s.balanceForecast).toBe(1250000 - 348408);
    db.close();
  });
});
