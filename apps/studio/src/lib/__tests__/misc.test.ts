import { describe, expect, it } from 'vitest';
import { slugify } from '@/lib/slug';
import { friendlyError } from '@/lib/errors';
import { safeNext } from '@/lib/urls';
import { formatDate } from '@/lib/catalog';

describe('web-address names', () => {
  it.each([
    ['Mithai Market', 'mithai-market'],
    ['Café Mondegar & Co.', 'cafe-mondegar-and-co'],
    ['  --Dr. Kapoor’s Clinic!! ', 'dr-kapoor-s-clinic'],
  ])('%j → %j', (input, expected) => expect(slugify(input)).toBe(expected));
});

describe('plain-language errors', () => {
  it('shows messages written for people as-is', () => {
    expect(friendlyError({ code: 'SF001', message: 'This invitation has expired.' })).toBe('This invitation has expired.');
  });
  it('explains permission problems', () => {
    expect(friendlyError({ code: '42501', message: 'new row violates row-level security policy' })).toMatch(/don’t have permission/);
  });
  it('explains login problems', () => {
    expect(friendlyError({ code: 'invalid_credentials' })).toMatch(/don’t match/);
  });
  it('never shows technical details for unknown errors', () => {
    const msg = friendlyError(new Error('ECONNRESET at socket.js:123'));
    expect(msg).not.toMatch(/ECONNRESET|socket/);
    expect(msg).toMatch(/Something went wrong/);
  });
});

describe('safe redirects after login', () => {
  it.each([
    ['/studio', '/studio'],
    ['/invite/abc', '/invite/abc'],
    ['https://evil.example', '/'],
    ['//evil.example', '/'],
    ['/\\evil.example', '/'],
    [undefined, '/'],
  ])('%j → %j', (input, expected) => expect(safeNext(input)).toBe(expected));
});

describe('Indian dates', () => {
  it('uses Indian time', () => {
    expect(formatDate('2026-09-25T20:00:00Z')).toBe('26 Sept 2026');
  });
});
