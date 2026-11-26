import { dateInMonth, monthOf, todayISO } from '../dates';

/** Data inicial sugerida para um novo item no mês selecionado. */
export function defaultDate(month: string): string {
  const now = new Date();
  if (monthOf(now) === month) return todayISO(now);
  return dateInMonth(month, month > monthOf(now) ? 1 : now.getDate());
}

export function today(): string {
  return todayISO(new Date());
}
