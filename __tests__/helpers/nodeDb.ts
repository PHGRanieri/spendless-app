const { DatabaseSync } = require('node:sqlite');
import { Db, SqlValue } from '../../src/db/adapter';
import { configureConnection, migrate } from '../../src/db/migrations';

export interface TestDb extends Db {
  close(): void;
}

const plain = <T,>(row: unknown): T => (row == null ? (row as T) : ({ ...(row as object) } as T));

/** Mesmo contrato do adaptador expo-sqlite, usando o SQLite embutido no Node. */
export function openNodeDb(path = ':memory:'): TestDb {
  const native = new DatabaseSync(path);
  const db: TestDb = {
    exec: (sql) => native.exec(sql),
    run: (sql, params: SqlValue[] = []) => {
      const r = native.prepare(sql).run(...params);
      return { changes: Number(r.changes), lastInsertRowId: Number(r.lastInsertRowid) };
    },
    all: <T,>(sql: string, params: SqlValue[] = []) =>
      native.prepare(sql).all(...params).map((r: unknown) => plain<T>(r)),
    first: <T,>(sql: string, params: SqlValue[] = []) => {
      const r = native.prepare(sql).get(...params);
      return r === undefined ? null : plain<T>(r);
    },
    close: () => native.close(),
  };
  configureConnection(db);
  migrate(db);
  return db;
}
