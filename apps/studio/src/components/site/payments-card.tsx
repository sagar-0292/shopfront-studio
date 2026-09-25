import { ActionForm } from '@/components/action-form';
import { Badge, buttonClass, Card, CardTitle, Field, Input, Notice } from '@/components/ui';
import type { Db } from '@/lib/db';
import { formatINR } from '@/lib/money';
import { formatDate } from '@/lib/catalog';
import { PROVIDERS, providerByKey, type PaymentSettings } from '@/lib/payments';
import { disconnectGateway, saveGatewayKeys, saveWaysToPay } from '@/app/site-settings/actions';
import { GatewayKeysForm } from './gateway-form';

type Loaded = { settings: (PaymentSettings & { provider_connected_at: string | null }) | null; status: { provider: string; hint: string; updated_at: string } | null };

export async function loadPayments(db: Db, siteId: string): Promise<Loaded> {
  const [settings, status] = await Promise.all([
    db.one<Loaded['settings'] & object>(`select * from site_payment_settings where site_id = $1`, [siteId]),
    db.one<NonNullable<Loaded['status']>>(`select * from payment_credentials_status($1)`, [siteId]),
  ]);
  return { settings, status };
}

export function PaymentsCard({ siteId, data, back, connectAvailable, notice }: { siteId: string; data: Loaded; back: string; connectAvailable: boolean; notice?: { ok: boolean; text: string } | null }) {
  const s = data.settings;
  const connected = s?.online_provider && s.provider_connected_at ? providerByKey(s.online_provider) : null;
  const check = (name: string, label: string, on: boolean, desc: string) => (
    <label className="flex items-start gap-3 rounded-xl border border-line p-3 has-[:checked]:border-primary/50 has-[:checked]:bg-primary/5">
      <input type="checkbox" name={name} defaultChecked={on} className="mt-1 size-4 accent-[var(--primary)]" />
      <span><span className="block text-sm font-semibold">{label}</span><span className="text-xs text-muted">{desc}</span></span>
    </label>
  );
  return (
    <Card>
      <CardTitle title="Payments" description="How customers can pay on this website. Money always goes straight to the shop’s own account." />
      {notice && <div className="mb-4"><Notice tone={notice.ok ? 'good' : 'bad'}>{notice.text}</Notice></div>}
      <ActionForm action={saveWaysToPay} submitLabel="Save payment options">
        <input type="hidden" name="site_id" value={siteId} />
        <div className="grid gap-3 sm:grid-cols-2">
          {check('whatsapp_enabled', 'Order on WhatsApp', s?.whatsapp_enabled ?? true, 'The order arrives in the shop’s WhatsApp; payment is arranged there.')}
          {check('upi_enabled', 'UPI (free)', s?.upi_enabled ?? false, 'Customers scan a QR code or tap to pay in their UPI app. No fees; the shop checks the payment arrived.')}
          {check('cod_enabled', 'Cash on delivery', s?.cod_enabled ?? false, 'Pay when the order arrives, up to a limit you choose.')}
          <label className="flex items-start gap-3 rounded-xl border border-line p-3 has-[:checked]:border-primary/50 has-[:checked]:bg-primary/5">
            <input type="checkbox" name="online_enabled" defaultChecked={s?.online_enabled ?? false} disabled={!connected} className="mt-1 size-4 accent-[var(--primary)]" />
            <span><span className="block text-sm font-semibold">Pay online (cards, UPI, netbanking)</span>
              <span className="text-xs text-muted">{connected ? `Through ${connected.name}. Takes payments from Phase 6 (order system).` : 'Connect a payment gateway below first.'}</span></span>
          </label>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Shop’s UPI ID" htmlFor={`upi-${siteId}`} hint="e.g. mithaimarket@okicici">
            <Input id={`upi-${siteId}`} name="upi_vpa" defaultValue={s?.upi_vpa ?? ''} maxLength={320} autoComplete="off" spellCheck={false} />
          </Field>
          <Field label="Name shown in the UPI app" htmlFor={`upiname-${siteId}`}>
            <Input id={`upiname-${siteId}`} name="upi_payee_name" defaultValue={s?.upi_payee_name ?? ''} maxLength={100} />
          </Field>
          <Field label="Cash-on-delivery limit (₹)" htmlFor={`cod-${siteId}`} hint={s?.cod_max_paise ? `Now: ${formatINR(Number(s.cod_max_paise))}` : 'Leave empty for no limit'}>
            <Input id={`cod-${siteId}`} name="cod_max" inputMode="numeric" defaultValue={s?.cod_max_paise ? String(Number(s.cod_max_paise) / 100) : ''} maxLength={20} />
          </Field>
        </div>
      </ActionForm>

      <div className="mt-8 border-t border-line pt-6">
        <h3 className="mb-1 text-base font-semibold text-brand">Payment gateway</h3>
        {connected ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-4">
            <div>
              <p className="flex flex-wrap items-center gap-2 font-semibold">{connected.name} <Badge tone={s!.online_mode === 'live' ? 'good' : 'warn'}>{s!.online_mode === 'live' ? 'Live' : 'Test mode'}</Badge></p>
              <p className="text-sm text-muted">{data.status?.hint} · connected {formatDate(s!.provider_connected_at!)}</p>
            </div>
            <ActionForm action={disconnectGateway} submitLabel="Disconnect" variant="ghost" className="flex" confirm={`Disconnect ${connected.name}? Its saved keys will be deleted.`}>
              <input type="hidden" name="site_id" value={siteId} />
            </ActionForm>
          </div>
        ) : (
          <div className="space-y-6">
            <p className="text-sm text-muted">Connect the shop’s own gateway account. Keys are encrypted before they are saved, and nobody — not even the agency — can view them again.</p>
            <div className="rounded-xl border border-line p-4">
              <p className="font-semibold">Razorpay <span className="text-sm font-normal text-muted">— recommended</span></p>
              <p className="mb-3 text-sm text-muted">The shop signs in to Razorpay and approves. No keys to copy.</p>
              {connectAvailable ? (
                <div className="flex flex-wrap gap-2">
                  <a className={buttonClass('primary')} href={`/api/payments/razorpay/connect?site=${siteId}&mode=test&back=${encodeURIComponent(back)}`}>Connect Razorpay (test)</a>
                  <a className={buttonClass('ghost')} href={`/api/payments/razorpay/connect?site=${siteId}&mode=live&back=${encodeURIComponent(back)}`}>Connect Razorpay (live)</a>
                </div>
              ) : (
                <p className="text-sm text-muted">One-click connect switches on once your agency’s Razorpay Partner account is set up (see SETUP.md). Until then, enter the shop’s Razorpay keys below.</p>
              )}
            </div>
            <details className="rounded-xl border border-line p-4">
              <summary className="cursor-pointer font-semibold">Enter keys instead (Razorpay, Cashfree, PhonePe, PayU, Stripe)</summary>
              <div className="mt-4">
                <GatewayKeysForm action={saveGatewayKeys} siteId={siteId} providers={PROVIDERS.map(({ key, name, about, fees, fields }) => ({ key, name, about, fees, fields: fields.map(({ name, label, secret, hint }) => ({ name, label, secret, hint })) }))} />
              </div>
            </details>
          </div>
        )}
      </div>
    </Card>
  );
}
