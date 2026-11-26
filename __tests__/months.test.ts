import { addFixedExpense, addIncome, addVariableExpense, deleteFixedExpense, updateFixedExpense } from '../src/domain/items';
import { autoCreateTarget, createMonth, ensureInitialMonth, nextMonthToCreate, runAutoCreate } from '../src/domain/months';
import { listFixedExpenses, listIncomes, listMonths, listVariableExpenses } from '../src/domain/repo';
import { addMonths } from '../src/dates';
import { at, counts, dump, freshDb, TODAY } from './helpers/fixtures';
import { openNodeDb } from './helpers/nodeDb';

function seedNovember() {
  const db = freshDb('2026-11');
  addIncome(db, '2026-11', { type: 'Salário', name: 'Salário', amountCents: 800000, date: '2026-11-05', recurrence: 'fixa', note: null }, TODAY);
  addIncome(db, '2026-11', { type: 'Venda', name: 'Bicicleta', amountCents: 90000, date: '2026-11-08', recurrence: 'mes', note: null }, TODAY);
  addFixedExpense(db, '2026-11', { type: 'Contas de casa', name: 'Aluguel', amountCents: 250000, dueDate: '2026-11-30', note: null });
  addFixedExpense(db, '2026-11', { type: 'Assinaturas', name: 'Streaming', amountCents: 3990, dueDate: '2026-11-15', note: 'plano família' });
  addVariableExpense(db, '2026-11', { type: 'Mercado', name: 'Feira', amountCents: 12000, dueDate: '2026-11-03', note: null, paymentMethod: 'dinheiro' });
  addVariableExpense(db, '2026-11', { type: 'Lazer', name: 'Videogame', amountCents: 300000, dueDate: '2026-11-20', note: null, paymentMethod: 'credito', installments: 6 });
  return db;
}

describe('geração idempotente do mês no dia 20', () => {
  test('dia 19 não cria; dia 20 cria o mês seguinte', () => {
    const db = seedNovember();
    expect(autoCreateTarget(db, at(2026, 11, 19))).toBeNull();
    expect(runAutoCreate(db, at(2026, 11, 19))).toBeNull();
    expect(listMonths(db)).toEqual(['2026-11']);

    const r = runAutoCreate(db, at(2026, 11, 20));
    expect(r).toMatchObject({ status: 'created', month: '2026-12' });
    expect(listMonths(db)).toEqual(['2026-11', '2026-12']);
    db.close();
  });

  test('rodar duas (ou mais) vezes nunca duplica itens', () => {
    const db = seedNovember();
    runAutoCreate(db, at(2026, 11, 20));
    const after1 = dump(db);
    const c1 = counts(db);

    expect(runAutoCreate(db, at(2026, 11, 20))).toBeNull(); // mês já existe
    expect(createMonth(db, '2026-12', 'auto', { now: at(2026, 11, 25) })).toEqual({ status: 'exists', month: '2026-12' });
    runAutoCreate(db, at(2026, 11, 28));

    expect(counts(db)).toEqual(c1);
    expect(dump(db)).toEqual(after1);
    db.close();
  });

  test('o mês novo recebe fixos, entradas fixas e parcelas — e NÃO as entradas "do mês"', () => {
    const db = seedNovember();
    runAutoCreate(db, at(2026, 11, 22));
    expect(listIncomes(db, '2026-12').map((i) => i.name)).toEqual(['Salário']);
    expect(listFixedExpenses(db, '2026-12').map((f) => [f.name, f.amountCents, f.dueDate, f.note])).toEqual([
      ['Streaming', 3990, '2026-12-15', 'plano família'],
      ['Aluguel', 250000, '2026-12-30', null],
    ]);
    expect(listVariableExpenses(db, '2026-12').map((v) => [v.name, v.installmentNo, v.amountCents])).toEqual([
      ['Videogame', 2, 50000],
    ]);
    db.close();
  });

  test('criação manual do próximo mês', () => {
    const db = seedNovember();
    expect(nextMonthToCreate(db, at(2026, 11, 2))).toBe('2026-12');
    createMonth(db, '2026-12', 'manual', { now: at(2026, 11, 2) });
    expect(nextMonthToCreate(db, at(2026, 11, 2))).toBe('2027-01');
    db.close();
  });

  test('primeiro uso cria o mês atual', () => {
    const db = openNodeDb();
    ensureInitialMonth(db, at(2026, 11, 26));
    ensureInitialMonth(db, at(2026, 11, 26));
    expect(listMonths(db)).toEqual(['2026-11']);
    db.close();
  });

  test('edição de fixo: "só este mês" x "este e os próximos"', () => {
    const db = seedNovember();
    createMonth(db, '2026-12', 'manual', { now: at(2026, 11, 2) });
    const rent = listFixedExpenses(db, '2026-11').find((f) => f.name === 'Aluguel')!;

    updateFixedExpense(db, rent.id, { type: 'Contas de casa', name: 'Aluguel', amountCents: 260000, dueDate: '2026-11-30', note: null }, 'only_this');
    expect(listFixedExpenses(db, '2026-12').find((f) => f.name === 'Aluguel')!.amountCents).toBe(250000);

    updateFixedExpense(db, rent.id, { type: 'Contas de casa', name: 'Aluguel', amountCents: 270000, dueDate: '2026-11-28', note: null }, 'this_and_next');
    expect(listFixedExpenses(db, '2026-12').find((f) => f.name === 'Aluguel')).toMatchObject({ amountCents: 270000, dueDate: '2026-12-28' });
    createMonth(db, '2027-01', 'manual', { now: at(2026, 12, 2) });
    expect(listFixedExpenses(db, '2027-01').find((f) => f.name === 'Aluguel')!.amountCents).toBe(270000);

    const streaming = listFixedExpenses(db, '2026-12').find((f) => f.name === 'Streaming')!;
    deleteFixedExpense(db, streaming.id, 'this_and_next');
    expect(listFixedExpenses(db, '2026-11').some((f) => f.name === 'Streaming')).toBe(true);
    expect(listFixedExpenses(db, '2026-12').some((f) => f.name === 'Streaming')).toBe(false);
    expect(listFixedExpenses(db, '2027-01').some((f) => f.name === 'Streaming')).toBe(false);
    createMonth(db, '2027-02', 'manual', { now: at(2027, 1, 2) });
    expect(listFixedExpenses(db, '2027-02').some((f) => f.name === 'Streaming')).toBe(false);
    db.close();
  });
});

describe('limite de 12 meses com confirmação', () => {
  function twelveMonths() {
    const db = seedNovember();
    let m = '2026-12';
    for (let i = 0; i < 11; i++) {
      createMonth(db, m, 'manual', { now: at(2026, 11, 1) });
      m = addMonths(m, 1);
    }
    expect(listMonths(db)).toHaveLength(12);
    return db;
  }

  test('sem confirmação nada é removido nem criado', () => {
    const db = twelveMonths();
    const before = dump(db);
    const r = createMonth(db, '2027-11', 'manual', { now: at(2027, 10, 1) });
    expect(r).toEqual({ status: 'needs_confirmation', month: '2027-11', toRemove: ['2026-11'] });
    expect(dump(db)).toEqual(before);

    // criação automática também pede confirmação
    const auto = runAutoCreate(db, at(2027, 10, 21));
    expect(auto).toMatchObject({ status: 'needs_confirmation', toRemove: ['2026-11'] });
    expect(dump(db)).toEqual(before);
    db.close();
  });

  test('com confirmação remove o mais antigo e cria o novo na mesma operação', () => {
    const db = twelveMonths();
    const r = runAutoCreate(db, at(2027, 10, 21), true);
    expect(r).toEqual({ status: 'created', month: '2027-11', removed: ['2026-11'] });
    const months = listMonths(db);
    expect(months).toHaveLength(12);
    expect(months[0]).toBe('2026-12');
    expect(months[11]).toBe('2027-11');
    expect(listIncomes(db, '2026-11')).toEqual([]);
    // séries continuam ativas no mês novo
    expect(listIncomes(db, '2027-11').map((i) => i.name)).toEqual(['Salário']);
    // a compra parcelada (6x, nov/26–abr/27) continua: ainda tem parcelas no histórico
    expect(counts(db).purchases).toBe(1);
    db.close();
  });
});
