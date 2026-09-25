import { describe, expect, it } from 'vitest';
import { normaliseGstin, normaliseIndianPhone } from '@/lib/phone';

describe('Indian phone numbers', () => {
  it.each([
    ['98200 12345', '+919820012345'],
    ['098200-12345', '+919820012345'],
    ['+91 98200 12345', '+919820012345'],
    ['919820012345', '+919820012345'],
    ['022 2412 3456', '+912224123456'],
    ['', null],
  ])('%j → %j', (input, expected) => {
    expect(normaliseIndianPhone(input)).toBe(expected);
  });

  it('explains what is wrong in plain words', () => {
    expect(() => normaliseIndianPhone('12')).toThrow(/doesn’t look like an Indian phone number/);
  });
});

describe('GSTIN', () => {
  it('tidies spacing and case', () => {
    expect(normaliseGstin(' 27aapfu0939f1zv ')).toBe('27AAPFU0939F1ZV');
  });
  it('rejects bad numbers with a helpful message', () => {
    expect(() => normaliseGstin('12345')).toThrow(/15 characters/);
  });
});
