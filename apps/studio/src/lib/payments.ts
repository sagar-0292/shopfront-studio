// Payment providers a shop can connect, and what each one needs.
// "public" fields may appear on the website; "secret" fields are encrypted.
export type ProviderKey = 'razorpay' | 'cashfree' | 'phonepe' | 'payu' | 'stripe';
type FieldSpec = { name: string; label: string; secret: boolean; pattern?: RegExp; hint?: string };
export type Provider = { key: ProviderKey; name: string; about: string; fees: string; fields: FieldSpec[]; connect?: boolean };

export const PROVIDERS: Provider[] = [
  {
    key: 'razorpay', name: 'Razorpay', connect: true,
    about: 'Cards, UPI, netbanking, wallets and EMI. Most popular in India.', fees: 'About 2% per payment',
    fields: [
      { name: 'key_id', label: 'Key ID', secret: false, pattern: /^rzp_(test|live)_[A-Za-z0-9]{8,32}$/, hint: 'Starts with rzp_test_ or rzp_live_' },
      { name: 'key_secret', label: 'Key secret', secret: true, pattern: /^[A-Za-z0-9]{16,64}$/ },
    ],
  },
  {
    key: 'cashfree', name: 'Cashfree Payments', about: 'Cards, UPI, netbanking, wallets, pay later.', fees: 'About 1.9% per payment',
    fields: [
      { name: 'app_id', label: 'App ID', secret: false, pattern: /^[A-Za-z0-9]{8,64}$/ },
      { name: 'secret_key', label: 'Secret key', secret: true, pattern: /^[A-Za-z0-9_-]{16,128}$/ },
    ],
  },
  {
    key: 'phonepe', name: 'PhonePe Payment Gateway', about: 'UPI-first gateway, plus cards and netbanking.', fees: 'Varies by plan',
    fields: [
      { name: 'client_id', label: 'Client ID', secret: false, pattern: /^[A-Za-z0-9_-]{6,64}$/ },
      { name: 'client_secret', label: 'Client secret', secret: true, pattern: /^[A-Za-z0-9_-]{16,128}$/ },
      { name: 'client_version', label: 'Client version', secret: false, pattern: /^\d{1,3}$/, hint: 'Usually 1' },
    ],
  },
  {
    key: 'payu', name: 'PayU', about: 'Cards, UPI, netbanking, EMI.', fees: 'About 2% per payment',
    fields: [
      { name: 'merchant_key', label: 'Merchant key', secret: false, pattern: /^[A-Za-z0-9]{4,32}$/ },
      { name: 'merchant_salt', label: 'Merchant salt', secret: true, pattern: /^[A-Za-z0-9]{8,128}$/ },
    ],
  },
  {
    key: 'stripe', name: 'Stripe', about: 'For customers paying from outside India with international cards.', fees: 'About 4.3% for international cards',
    fields: [
      { name: 'publishable_key', label: 'Publishable key', secret: false, pattern: /^pk_(test|live)_[A-Za-z0-9]{10,200}$/, hint: 'Starts with pk_test_ or pk_live_' },
      { name: 'secret_key', label: 'Secret key', secret: true, pattern: /^(sk|rk)_(test|live)_[A-Za-z0-9]{10,200}$/, hint: 'Starts with sk_ or rk_' },
    ],
  },
];

export const providerByKey = (k: string) => PROVIDERS.find((p) => p.key === k);

export type ParsedKeys = { publicId: string; secrets: Record<string, string>; publicFields: Record<string, string>; hint: string; mode: 'test' | 'live' };

/** Checks what was pasted and splits it into what is public and what must be encrypted. */
export function parseProviderKeys(p: Provider, input: Record<string, string>, modeInput: string): ParsedKeys | { error: string } {
  const secrets: Record<string, string> = {};
  const publicFields: Record<string, string> = {};
  for (const f of p.fields) {
    const v = (input[f.name] ?? '').trim();
    if (!v) return { error: `Please enter the ${p.name} ${f.label}.` };
    if (f.pattern && !f.pattern.test(v)) return { error: `That ${p.name} ${f.label} doesn’t look right.${f.hint ? ` ${f.hint}.` : ''} Copy it again from your ${p.name} dashboard.` };
    (f.secret ? secrets : publicFields)[f.name] = v;
  }
  const first = publicFields[p.fields.find((f) => !f.secret)!.name];
  // Razorpay and Stripe keys say whether they are test or live; don't let the choice contradict them.
  const inferred = /_live_/.test(first) ? 'live' : /_test_/.test(first) ? 'test' : null;
  const mode = (inferred ?? (modeInput === 'live' ? 'live' : 'test')) as 'test' | 'live';
  if (inferred && modeInput && modeInput !== inferred) return { error: `These are ${inferred} keys, but you chose ${modeInput} mode. Pick ${inferred} mode or use ${modeInput} keys.` };
  const lastSecret = Object.values(secrets)[0] ?? '';
  return { publicId: first, secrets, publicFields, hint: `••••${lastSecret.slice(-4)}`, mode };
}

export type PaymentSettings = {
  whatsapp_enabled: boolean;
  upi_enabled: boolean; upi_vpa: string | null; upi_payee_name: string | null;
  cod_enabled: boolean; cod_max_paise: string | number | null;
  online_enabled: boolean; online_provider: ProviderKey | null; online_mode: 'test' | 'live'; provider_public_id: string | null;
};

/** The payment part of a website's public settings (used when the site is built). Never contains secrets. */
export function publicPaymentConfig(s: PaymentSettings) {
  return {
    whatsapp: s.whatsapp_enabled,
    ...(s.upi_enabled && s.upi_vpa ? { upi: { vpa: s.upi_vpa, name: s.upi_payee_name ?? undefined } } : {}),
    ...(s.cod_enabled ? { cod: { max_paise: s.cod_max_paise == null ? null : Number(s.cod_max_paise) } } : {}),
    ...(s.online_enabled && s.online_provider ? { online: { provider: s.online_provider, publicId: s.provider_public_id, mode: s.online_mode } } : {}),
  };
}

export const UPI_RE = /^[a-zA-Z0-9._-]{2,255}@[a-zA-Z][a-zA-Z0-9.-]{1,63}$/;
