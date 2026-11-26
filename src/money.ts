/**
 * Dinheiro é sempre um inteiro em centavos. Nada aqui usa float para valores.
 */

/** Limite de dígitos digitados (R$ 9.999.999.999,99) — bem abaixo de Number.MAX_SAFE_INTEGER. */
const MAX_INPUT_DIGITS = 12;

export function isCents(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

/** 123456 -> "R$ 1.234,56"; -5 -> "-R$ 0,05" */
export function formatBRL(cents: number): string {
  if (!isCents(cents)) throw new Error(`Valor monetário inválido: ${cents}`);
  const negative = cents < 0;
  const abs = negative ? -cents : cents;
  const reais = Math.trunc(abs / 100);
  const centavos = abs - reais * 100;
  const reaisStr = String(reais).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const centStr = String(centavos).padStart(2, '0');
  return `${negative ? '-' : ''}R$ ${reaisStr},${centStr}`;
}

/**
 * Converte o texto de um campo com máscara em centavos: só os dígitos contam,
 * preenchendo da direita para a esquerda ("R$ 12,345" -> 12345).
 */
export function centsFromMaskedInput(text: string): number {
  const digits = text.replace(/\D/g, '').replace(/^0+/, '').slice(0, MAX_INPUT_DIGITS);
  if (digits === '') return 0;
  let cents = 0;
  for (const ch of digits) cents = cents * 10 + (ch.charCodeAt(0) - 48);
  return cents;
}
