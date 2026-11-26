import { centsFromMaskedInput, formatBRL } from '../src/money';
import { addMonths, dateInMonth, monthDiff, isDate } from '../src/dates';

describe('dinheiro em centavos', () => {
  test('formata BRL', () => {
    expect(formatBRL(123456)).toBe('R$ 1.234,56');
    expect(formatBRL(0)).toBe('R$ 0,00');
    expect(formatBRL(5)).toBe('R$ 0,05');
    expect(formatBRL(-150000)).toBe('-R$ 1.500,00');
    expect(formatBRL(100000000)).toBe('R$ 1.000.000,00');
  });

  test('rejeita valores não inteiros', () => {
    expect(() => formatBRL(10.5)).toThrow();
  });

  test('máscara de digitação vira centavos inteiros', () => {
    expect(centsFromMaskedInput('R$ 12,345')).toBe(12345);
    expect(centsFromMaskedInput('R$ 0,0')).toBe(0);
    expect(centsFromMaskedInput('abc')).toBe(0);
    expect(Number.isInteger(centsFromMaskedInput('R$ 9.999.999.999,999'))).toBe(true);
  });
});

describe('datas', () => {
  test('aritmética de meses', () => {
    expect(addMonths('2026-11', 1)).toBe('2026-12');
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(monthDiff('2026-11', '2027-02')).toBe(3);
  });

  test('dia limitado ao fim do mês', () => {
    expect(dateInMonth('2027-02', 31)).toBe('2027-02-28');
    expect(dateInMonth('2028-02', 31)).toBe('2028-02-29');
    expect(isDate('2027-02-29')).toBe(false);
  });
});
