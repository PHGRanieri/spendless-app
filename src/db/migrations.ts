import { Db, transaction } from './adapter';

/**
 * Migrações versionadas e SOMENTE ADITIVAS.
 * Regra: nunca editar uma migração já publicada, nunca usar DROP TABLE nem
 * recriar tabelas com dados. Para mudar o schema, acrescente um novo item
 * ao final da lista (CREATE TABLE IF NOT EXISTS / ALTER TABLE ... ADD COLUMN).
 * A versão aplicada fica em PRAGMA user_version.
 */
export const MIGRATIONS: readonly string[] = [
  // v1
  `
  CREATE TABLE IF NOT EXISTS months (
    id          TEXT PRIMARY KEY NOT NULL,
    created_at  TEXT NOT NULL,
    origin      TEXT NOT NULL CHECK (origin IN ('manual','auto','import'))
  );

  CREATE TABLE IF NOT EXISTS series (
    id            INTEGER PRIMARY KEY,
    kind          TEXT NOT NULL CHECK (kind IN ('income','fixed_expense')),
    type          TEXT NOT NULL,
    name          TEXT NOT NULL,
    amount_cents  INTEGER NOT NULL CHECK (amount_cents >= 0),
    day           INTEGER NOT NULL CHECK (day BETWEEN 1 AND 31),
    note          TEXT,
    start_month   TEXT NOT NULL,
    end_month     TEXT
  );

  CREATE TABLE IF NOT EXISTS incomes (
    id            INTEGER PRIMARY KEY,
    month         TEXT NOT NULL REFERENCES months(id) ON DELETE CASCADE,
    series_id     INTEGER REFERENCES series(id),
    recurrence    TEXT NOT NULL CHECK (recurrence IN ('fixa','mes')),
    type          TEXT NOT NULL,
    name          TEXT NOT NULL,
    amount_cents  INTEGER NOT NULL CHECK (amount_cents >= 0),
    date          TEXT NOT NULL,
    received      INTEGER NOT NULL DEFAULT 0 CHECK (received IN (0,1)),
    note          TEXT,
    UNIQUE (month, series_id)
  );
  CREATE INDEX IF NOT EXISTS idx_incomes_month ON incomes(month);

  CREATE TABLE IF NOT EXISTS fixed_expenses (
    id            INTEGER PRIMARY KEY,
    month         TEXT NOT NULL REFERENCES months(id) ON DELETE CASCADE,
    series_id     INTEGER NOT NULL REFERENCES series(id),
    type          TEXT NOT NULL,
    name          TEXT NOT NULL,
    amount_cents  INTEGER NOT NULL CHECK (amount_cents >= 0),
    due_date      TEXT NOT NULL,
    paid          INTEGER NOT NULL DEFAULT 0 CHECK (paid IN (0,1)),
    note          TEXT,
    UNIQUE (month, series_id)
  );
  CREATE INDEX IF NOT EXISTS idx_fixed_month ON fixed_expenses(month);

  CREATE TABLE IF NOT EXISTS credit_purchases (
    id                      INTEGER PRIMARY KEY,
    type                    TEXT NOT NULL,
    name                    TEXT NOT NULL,
    total_cents             INTEGER NOT NULL CHECK (total_cents >= 0),
    installments            INTEGER NOT NULL CHECK (installments >= 1),
    first_month             TEXT NOT NULL,
    due_day                 INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 31),
    note                    TEXT,
    installment_cents       INTEGER NOT NULL CHECK (installment_cents >= 0),
    last_installment_cents  INTEGER NOT NULL CHECK (last_installment_cents >= 0)
  );

  CREATE TABLE IF NOT EXISTS variable_expenses (
    id              INTEGER PRIMARY KEY,
    month           TEXT NOT NULL REFERENCES months(id) ON DELETE CASCADE,
    type            TEXT NOT NULL,
    name            TEXT NOT NULL,
    amount_cents    INTEGER NOT NULL CHECK (amount_cents >= 0),
    due_date        TEXT NOT NULL,
    paid            INTEGER NOT NULL DEFAULT 0 CHECK (paid IN (0,1)),
    note            TEXT,
    payment_method  TEXT NOT NULL,
    purchase_id     INTEGER REFERENCES credit_purchases(id) ON DELETE CASCADE,
    installment_no  INTEGER,
    UNIQUE (purchase_id, installment_no)
  );
  CREATE INDEX IF NOT EXISTS idx_variable_month ON variable_expenses(month);
  `,
];

export const SCHEMA_VERSION = MIGRATIONS.length;

export function getSchemaVersion(db: Db): number {
  return db.first<{ user_version: number }>('PRAGMA user_version')?.user_version ?? 0;
}

/** Aplica as migrações pendentes, cada uma em sua própria transação. */
export function migrate(db: Db): void {
  const current = getSchemaVersion(db);
  if (current > SCHEMA_VERSION) {
    throw new Error(
      `O banco está na versão ${current}, mais nova que este app (${SCHEMA_VERSION}). Atualize o app.`,
    );
  }
  for (let v = current; v < SCHEMA_VERSION; v++) {
    transaction(db, () => {
      db.exec(MIGRATIONS[v]);
      db.exec(`PRAGMA user_version = ${v + 1}`);
    });
  }
}

/** Configuração de conexão (fora de transação). */
export function configureConnection(db: Db): void {
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA synchronous = FULL');
}
