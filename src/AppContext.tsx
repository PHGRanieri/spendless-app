import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { notify } from './components/dialogs';
import type { Db } from './db/adapter';
import { listMonths } from './domain/repo';
import { UserError } from './domain/types';
import { monthOf } from './dates';

interface AppState {
  db: Db;
  months: string[];
  month: string;
  setMonth: (m: string) => void;
  /** Incrementa a cada gravação; telas usam como dependência para recarregar. */
  version: number;
  refresh: () => void;
  /** Executa uma gravação, mostra erros de forma clara e recarrega as telas. */
  run: (fn: () => void) => boolean;
}

const Ctx = createContext<AppState | null>(null);

export function errorMessage(e: unknown): string {
  if (e instanceof UserError) return e.message;
  if (e instanceof Error) return e.message;
  return 'Ocorreu um erro inesperado.';
}

/** Mês a mostrar: o atual se existir; senão o mais recente anterior a ele; senão o mais antigo. */
function pickMonth(months: string[], preferred: string | null): string {
  if (preferred && months.includes(preferred)) return preferred;
  const today = monthOf(new Date());
  if (months.includes(today)) return today;
  const before = months.filter((m) => m < today);
  return before.length ? before[before.length - 1] : months[0] ?? today;
}

export function AppProvider({ db, children }: { db: Db; children: React.ReactNode }) {
  const [version, setVersion] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  const months = useMemo(() => listMonths(db), [db, version]);
  const month = pickMonth(months, selected);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  const run = useCallback(
    (fn: () => void) => {
      try {
        fn();
        return true;
      } catch (e) {
        void notify('error', 'Não foi possível salvar', errorMessage(e));
        return false;
      } finally {
        setVersion((v) => v + 1);
      }
    },
    [],
  );

  const value = useMemo(
    () => ({ db, months, month, setMonth: setSelected, version, refresh, run }),
    [db, months, month, version, refresh, run],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp fora do AppProvider');
  return v;
}
