// Checks what shoppers type, with messages in plain words.
export function indianMobile(input: string): string | null {
  let d = input.replace(/[^\d]/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? `+91${d}` : null;
}
export const pincode = (s: string) => /^[1-9]\d{5}$/.test(s.trim());

export type Customer = { name: string; phone: string; address?: string; pincode?: string; notes?: string };

export function checkCustomer(c: Customer, needAddress: boolean): Record<string, string> {
  const e: Record<string, string> = {};
  if (c.name.trim().length < 2) e.name = 'Please enter your name.';
  if (!indianMobile(c.phone)) e.phone = 'Please enter a 10-digit mobile number, e.g. 98200 12345.';
  if (needAddress) {
    if ((c.address ?? '').trim().length < 10) e.address = 'Please enter your full delivery address.';
    if (!pincode(c.pincode ?? '')) e.pincode = 'Please enter a 6-digit PIN code.';
  }
  return e;
}
