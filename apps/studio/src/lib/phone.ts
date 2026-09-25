import { UserError } from '@/lib/action';

/** Accepts "98200 12345", "+91 98200-12345", "09820012345" → "+919820012345". */
export function normaliseIndianPhone(input: string | null | undefined): string | null {
  const raw = (input ?? '').trim();
  if (!raw) return null;
  let digits = raw.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) {
    if (!/^\+\d{8,15}$/.test(digits)) throw new UserError(`“${raw}” doesn’t look like a phone number.`);
    return digits;
  }
  digits = digits.replace(/^0+/, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  if (/^[6-9]\d{9}$/.test(digits)) return `+91${digits}`;
  if (/^\d{8,11}$/.test(digits)) return `+91${digits}`; // landline with STD code
  throw new UserError(`“${raw}” doesn’t look like an Indian phone number. Use 10 digits, e.g. 98200 12345.`);
}

export function normaliseGstin(input: string | null | undefined): string | null {
  const v = (input ?? '').replace(/\s/g, '').toUpperCase();
  if (!v) return null;
  if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/.test(v)) {
    throw new UserError('That GSTIN doesn’t look right. It should be 15 characters, like 27AAPFU0939F1ZV.');
  }
  return v;
}
