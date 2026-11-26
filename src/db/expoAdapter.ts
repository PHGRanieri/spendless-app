import * as SQLite from 'expo-sqlite';
import { Db, SqlValue } from './adapter';
import { configureConnection, migrate } from './migrations';

const DB_NAME = 'spendless.db';

function wrap(native: SQLite.SQLiteDatabase): Db {
  return {
    exec: (sql) => native.execSync(sql),
    run: (sql, params: SqlValue[] = []) => {
      const r = native.runSync(sql, params);
      return { changes: r.changes, lastInsertRowId: r.lastInsertRowId };
    },
    all: <T,>(sql: string, params: SqlValue[] = []) => native.getAllSync<T>(sql, params),
    first: <T,>(sql: string, params: SqlValue[] = []) => native.getFirstSync<T>(sql, params),
  };
}

let instance: Db | null = null;

/** Abre (uma única vez) o banco local e aplica as migrações. */
export function openAppDb(): Db {
  if (instance) return instance;
  const db = wrap(SQLite.openDatabaseSync(DB_NAME));
  configureConnection(db);
  migrate(db);
  instance = db;
  return db;
}
