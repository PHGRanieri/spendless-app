import { exportBackup, importBackup, parseBackup, serializeBackup, summarizeBackup } from '../src/domain/backup';
import { addFixedExpense, addIncome, addVariableExpense, toggleFixedExpensePaid, toggleIncomeReceived, toggleVariableExpensePaid } from '../src/domain/items';
import { createMonth } from '../src/domain/months';
import { listIncomes, listVariableExpenses } from '../src/domain/repo';
import type { Db } from '../src/db/adapter';
import { at, dump, freshDb, TODAY } from './helpers/fixtures';
import { openNodeDb } from './helpers/nodeDb';

function populated() {
  const db = freshDb('2026-11');
  addIncome(db, '2026-11', { type: 'Salário', name: 'Salário', amountCents: 712345, date: '2026-11-05', recurrence: 'fixa', note: 'empresa' }, TODAY);
  addIncome(db, '2026-11', { type: 'Venda', name: 'Celular "antigo"', amountCents: 80001, date: '2026-11-09', recurrence: 'mes', note: null }, TODAY);
  addFixedExpense(db, '2026-11', { type: 'Contas de casa', name: 'Condomínio', amountCents: 65099, dueDate: '2026-11-10', note: null });
  addVariableExpense(db, '2026-11', { type: 'Pets', name: 'Ração', amountCents: 18990, dueDate: '2026-11-14', note: 'ção ✓', paymentMethod: 'debito' });
  addVariableExpense(db, '2026-11', { type: 'Estudos', name: 'Curso', amountCents: 100000, dueDate: '2026-11-15', note: null, paymentMethod: 'credito', installments: 3 });
  createMonth(db, '2026-12', 'auto', { now: at(2026, 11, 20) });
  // mistura de status para garantir que são preservados
  toggleIncomeReceived(db, listIncomes(db, '2026-11')[0].id);
  toggleFixedExpensePaid(db, db.first<{ id: number }>('SELECT id FROM fixed_expenses LIMIT 1')!.id);
  toggleVariableExpensePaid(db, listVariableExpenses(db, '2026-12')[0].id);
  return db;
}

describe('exportar → importar', () => {
  test('ida e volta com dados idênticos (incluindo status)', () => {
    const src = populated();
    const json = serializeBackup(exportBackup(src, at(2026, 11, 26)));

    const parsed = JSON.parse(json);
    expect(parsed.schemaVersion).toBe(1);
    expect(typeof parsed.exportedAt).toBe('string');
    expect(parsed.data.incomes.some((i: { received: boolean }) => i.received === true)).toBe(true);

    const dst = openNodeDb();
    createMonth(dst, '2025-01', 'manual', { now: at(2025, 1, 1) }); // dados antigos que serão substituídos
    const backup = parseBackup(json);
    expect(summarizeBackup(backup)).toEqual({ months: 2, items: 3 + 2 + 3, monthIds: ['2026-11', '2026-12'] });
    importBackup(dst, backup);

    expect(dump(dst)).toEqual(dump(src));
    // e exportar de novo gera exatamente o mesmo conteúdo
    expect(serializeBackup(exportBackup(dst, at(2026, 11, 26)))).toBe(json);
    src.close();
    dst.close();
  });
});

describe('importação com arquivo inválido não altera nenhum dado', () => {
  const tryImport = (db: Db, text: string) => {
    const before = dump(db);
    expect(() => importBackup(db, parseBackup(text))).toThrow();
    expect(dump(db)).toEqual(before);
  };

  test('JSON truncado / corrompido', () => {
    const db = populated();
    const json = serializeBackup(exportBackup(db, at(2026, 11, 26)));
    tryImport(db, json.slice(0, json.length / 2));
    tryImport(db, '');
    tryImport(db, '\u0000\u0001garbage');
    expect(() => parseBackup('{"app":')).toThrow(/JSON válido/);
    db.close();
  });

  test('schema / versão inválidos', () => {
    const db = populated();
    const ok = exportBackup(db, at(2026, 11, 26));
    const variants: unknown[] = [
      { ...ok, app: 'outro-app' },
      { ...ok, schemaVersion: 999 },
      { ...ok, schemaVersion: '1' },
      { ...ok, data: undefined },
      { ...ok, data: { ...ok.data, incomes: [{ ...ok.data.incomes[0], amountCents: 10.5 }] } },
      { ...ok, data: { ...ok.data, incomes: [{ ...ok.data.incomes[0], received: 'sim' }] } },
      { ...ok, data: { ...ok.data, fixedExpenses: [{ ...ok.data.fixedExpenses[0], type: 'Inventado' }] } },
      { ...ok, data: { ...ok.data, variableExpenses: [{ ...ok.data.variableExpenses[0], month: '2030-01' }] } },
      { ...ok, data: { ...ok.data, variableExpenses: [...ok.data.variableExpenses, ok.data.variableExpenses[0]] } },
    ];
    for (const v of variants) tryImport(db, JSON.stringify(v));
    expect(() => parseBackup(JSON.stringify({ ...ok, schemaVersion: 999 }))).toThrow(/versão 999/);
    db.close();
  });

  test('falha no meio da gravação: ROLLBACK mantém tudo intacto', () => {
    const db = populated();
    const backup = parseBackup(serializeBackup(exportBackup(db, at(2026, 11, 26))));
    // Altera os dados atuais para que sejam diferentes do backup
    addVariableExpense(db, '2026-12', { type: 'Lazer', name: 'Cinema', amountCents: 5000, dueDate: '2026-12-01', note: null, paymentMethod: 'pix' });
    const before = dump(db);

    // Simula falha depois de várias gravações (ex.: disco cheio)
    let calls = 0;
    const flaky: Db = {
      ...db,
      run: (sql, params) => {
        if (++calls === 12) throw new Error('falha simulada de disco');
        return db.run(sql, params);
      },
    };
    expect(() => importBackup(flaky, backup)).toThrow('falha simulada de disco');
    expect(calls).toBe(12);
    expect(dump(db)).toEqual(before);
    db.close();
  });
});
