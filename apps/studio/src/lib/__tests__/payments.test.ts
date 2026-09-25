import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import { encryptSecret, decryptSecret } from '@/lib/secrets';
import { parseProviderKeys, providerByKey, publicPaymentConfig } from '@/lib/payments';
import { normaliseWebsite } from '@/lib/url';

describe('payment key encryption', () => {
  beforeEach(() => { process.env.PAYMENT_SECRETS_KEY = randomBytes(32).toString('base64'); });
  afterEach(() => { delete process.env.PAYMENT_SECRETS_KEY; });

  it('round-trips, and every encryption looks different', () => {
    const a = encryptSecret({ key_secret: 'abcd1234abcd1234' });
    const b = encryptSecret({ key_secret: 'abcd1234abcd1234' });
    expect(a).not.toBe(b);
    expect(a).not.toContain('abcd1234');
    expect(decryptSecret(a)).toEqual({ key_secret: 'abcd1234abcd1234' });
  });
  it('detects tampering', () => {
    const t = encryptSecret({ s: 'x' });
    const bad = t.slice(0, -3) + (t.endsWith('A') ? 'BBB' : 'AAA');
    expect(() => decryptSecret(bad)).toThrow();
  });
  it('cannot be read with a different server key', () => {
    const t = encryptSecret({ s: 'x' });
    process.env.PAYMENT_SECRETS_KEY = randomBytes(32).toString('base64');
    expect(() => decryptSecret(t)).toThrow();
  });
  it('explains plainly when the server key is missing', () => {
    delete process.env.PAYMENT_SECRETS_KEY;
    expect(() => encryptSecret('x')).toThrow(/encryption key isn’t set up/);
  });
});

describe('provider keys', () => {
  const rzp = providerByKey('razorpay')!;
  it('splits public and secret parts and infers live/test', () => {
    const r = parseProviderKeys(rzp, { key_id: 'rzp_live_AbCdEf123456', key_secret: 'S3cr3tS3cr3tS3cr3tXYZW' }, 'live');
    expect(r).toEqual({ publicId: 'rzp_live_AbCdEf123456', secrets: { key_secret: 'S3cr3tS3cr3tS3cr3tXYZW' }, publicFields: { key_id: 'rzp_live_AbCdEf123456' }, hint: '••••XYZW', mode: 'live' });
  });
  it('catches wrong or mismatched keys with helpful messages', () => {
    expect(parseProviderKeys(rzp, { key_id: 'abc', key_secret: 'x' }, 'test')).toEqual({ error: 'That Razorpay Key ID doesn’t look right. Starts with rzp_test_ or rzp_live_. Copy it again from your Razorpay dashboard.' });
    expect(parseProviderKeys(rzp, { key_id: 'rzp_test_AbCdEf123456', key_secret: 'S3cr3tS3cr3tS3cr3t' }, 'live')).toEqual({ error: 'These are test keys, but you chose live mode. Pick test mode or use live keys.' });
    expect(parseProviderKeys(providerByKey('stripe')!, { publishable_key: 'pk_test_abcdefghijk' }, 'test')).toEqual({ error: 'Please enter the Stripe Secret key.' });
  });
  it('the public website settings never include secrets', () => {
    const cfg = publicPaymentConfig({ whatsapp_enabled: true, upi_enabled: true, upi_vpa: 'shop@okhdfc', upi_payee_name: 'Shop', cod_enabled: true, cod_max_paise: '500000', online_enabled: true, online_provider: 'razorpay', online_mode: 'live', provider_public_id: 'rzp_live_x' });
    expect(cfg).toEqual({ whatsapp: true, upi: { vpa: 'shop@okhdfc', name: 'Shop' }, cod: { max_paise: 500000 }, online: { provider: 'razorpay', publicId: 'rzp_live_x', mode: 'live' } });
    expect(JSON.stringify(cfg)).not.toMatch(/secret|salt/i);
  });
});

describe('reference web addresses', () => {
  it.each([
    ['rival-sweets.in', 'https://rival-sweets.in'],
    ['HTTPS://Rival-Sweets.IN/Menu/', 'https://rival-sweets.in/Menu'],
    ['http://shop.example.co.in/a?b=1#top', 'http://shop.example.co.in/a?b=1'],
  ])('%s → %s', (i, o) => expect(normaliseWebsite(i)).toBe(o));
  it.each(['', 'localhost:3000', 'http://192.168.1.1', 'javascript:alert(1)', 'ftp://files.in', 'not a url'])('refuses %j', (i) => {
    expect(() => normaliseWebsite(i)).toThrow();
  });
});
