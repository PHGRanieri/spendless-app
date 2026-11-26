/** Mês no formato "YYYY-MM"; datas no formato "YYYY-MM-DD" (sempre horário local). */

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;
const DATE_RE = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const pad2 = (n: number) => String(n).padStart(2, '0');

export function isMonth(value: unknown): value is string {
  return typeof value === 'string' && MONTH_RE.test(value);
}

export function isDate(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const day = Number(value.slice(8, 10));
  return day <= daysInMonth(value.slice(0, 7));
}

export function monthOf(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

export function todayISO(now: Date): string {
  return `${monthOf(now)}-${pad2(now.getDate())}`;
}

function parts(month: string): [number, number] {
  const m = MONTH_RE.exec(month);
  if (!m) throw new Error(`Mês inválido: ${month}`);
  return [Number(m[1]), Number(m[2])];
}

export function addMonths(month: string, n: number): string {
  const [y, m] = parts(month);
  const idx = y * 12 + (m - 1) + n;
  return `${Math.floor(idx / 12)}-${pad2((idx % 12) + 1)}`;
}

/** Quantos meses de `from` até `to` (to − from). */
export function monthDiff(from: string, to: string): number {
  const [y1, m1] = parts(from);
  const [y2, m2] = parts(to);
  return (y2 - y1) * 12 + (m2 - m1);
}

export function daysInMonth(month: string): number {
  const [y, m] = parts(month);
  return new Date(y, m, 0).getDate();
}

/** Data no mês, com o dia limitado ao último dia do mês (31 -> 28 em fevereiro). */
export function dateInMonth(month: string, day: number): string {
  const d = Math.min(Math.max(1, Math.trunc(day)), daysInMonth(month));
  return `${month}-${pad2(d)}`;
}

export function dayOf(date: string): number {
  return Number(date.slice(8, 10));
}

export function monthOfDate(date: string): string {
  return date.slice(0, 7);
}

/** "2026-11" -> "Novembro 2026" */
export function monthLabel(month: string): string {
  const [y, m] = parts(month);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

/** "2026-11" -> "Nov/2026" */
export function monthShortLabel(month: string): string {
  const [y, m] = parts(month);
  return `${MONTH_NAMES[m - 1].slice(0, 3)}/${y}`;
}

/** "2026-11-05" -> "05/11" */
export function shortDateLabel(date: string): string {
  return `${date.slice(8, 10)}/${date.slice(5, 7)}`;
}

/** Dia da semana (0 = domingo) do dia 1 do mês. */
export function firstWeekday(month: string): number {
  const [y, m] = parts(month);
  return new Date(y, m - 1, 1).getDay();
}
