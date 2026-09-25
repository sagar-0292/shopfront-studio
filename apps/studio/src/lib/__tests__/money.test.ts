import { describe, expect, it } from 'vitest';
import { formatINR, parseINR } from '@/lib/money';

describe('rupee formatting (Indian style)', () => {
  it.each([
    [0, '₹0'],
    [100, '₹1'],
    [99900, '₹999'],
    [100000, '₹1,000'],
    [12500000, '₹1,25,000'],
    [1000000000, '₹1,00,00,000'],
    [49950, '₹499.50'],
    ['12500000', '₹1,25,000'],
  ])('%s paise → %s', (paise, expected) => {
    expect(formatINR(paise)).toBe(expected);
  });

  it('can always show paise', () => {
    expect(formatINR(12500000, { exact: true })).toBe('₹1,25,000.00');
  });

  it('shows a dash for nonsense', () => {
    expect(formatINR('abc')).toBe('—');
  });
});

describe('reading typed amounts', () => {
  it.each([
    ['1,25,000', 12500000],
    ['₹ 499.50', 49950],
    ['Rs. 99', 9900],
    ['1250', 125000],
  ])('%s → %s paise', (input, paise) => {
    expect(parseINR(input)).toBe(paise);
  });

  it.each(['', 'abc', '12.345', '-5'])('rejects %j', (input) => {
    expect(parseINR(input)).toBeNull();
  });
});
