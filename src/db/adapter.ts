/**
 * Camada fina sobre o SQLite. Tudo é síncrono: como o JS roda em uma única
 * thread, nenhuma outra operação consegue se intercalar dentro de uma transação.
 * Em produção usa expo-sqlite; nos testes, node:sqlite — com o mesmo SQL.
 */
export type SqlValue = string | number | null;

export interface RunResult {
  changes: number;
  lastInsertRowId: number;
}

export interface Db {
  exec(sql: string): void;
  run(sql: string, params?: SqlValue[]): RunResult;
  all<T>(sql: string, params?: SqlValue[]): T[];
  first<T>(sql: string, params?: SqlValue[]): T | null;
}

const depth = new WeakMap<Db, number>();

/**
 * Executa `fn` dentro de UMA transação. Qualquer erro desfaz tudo (ROLLBACK)
 * e é relançado. Chamadas aninhadas participam da transação externa.
 */
export function transaction<T>(db: Db, fn: () => T): T {
  const d = depth.get(db) ?? 0;
  if (d > 0) {
    depth.set(db, d + 1);
    try {
      return fn();
    } finally {
      depth.set(db, d);
    }
  }
  db.exec('BEGIN IMMEDIATE');
  depth.set(db, 1);
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // a transação já pode ter sido desfeita pelo próprio SQLite
    }
    throw err;
  } finally {
    depth.set(db, 0);
  }
}
