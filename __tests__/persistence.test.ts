import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { addIncome, toggleIncomeReceived } from '../src/domain/items';
import { createMonth } from '../src/domain/months';
import { listIncomes, listMonths } from '../src/domain/repo';
import { getSchemaVersion, SCHEMA_VERSION } from '../src/db/migrations';
import { at, TODAY } from './helpers/fixtures';
import { openNodeDb } from './helpers/nodeDb';

test('dados gravados continuam após fechar e reabrir o banco (migração não apaga nada)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'spendless-'));
  const file = join(dir, 'spendless.db');
  try {
    const db1 = openNodeDb(file);
    createMonth(db1, '2026-11', 'manual', { now: at(2026, 11, 1) });
    const id = addIncome(db1, '2026-11', { type: 'Salário', name: 'Salário', amountCents: 654321, date: '2026-11-05', recurrence: 'fixa', note: null }, TODAY);
    toggleIncomeReceived(db1, id);
    db1.close(); // simula o app sendo encerrado

    const db2 = openNodeDb(file); // reabre e roda migrate() de novo
    expect(getSchemaVersion(db2)).toBe(SCHEMA_VERSION);
    expect(listMonths(db2)).toEqual(['2026-11']);
    expect(listIncomes(db2, '2026-11')).toEqual([
      expect.objectContaining({ name: 'Salário', amountCents: 654321, received: true }),
    ]);
    db2.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
