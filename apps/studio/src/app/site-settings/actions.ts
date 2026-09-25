'use server';

// Website settings shared by the agency studio and the business owner's admin:
// reference/competitor links and payment options. Every change is checked by
// the database's security rules for the logged-in person.
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { withUser } from '@/lib/db';
import { optional, safe, text, UserError } from '@/lib/action';
import { normaliseWebsite } from '@/lib/url';
import { parseINR } from '@/lib/money';
import { encryptSecret } from '@/lib/secrets';
import { parseProviderKeys, providerByKey, UPI_RE } from '@/lib/payments';

const refresh = () => {
  revalidatePath('/studio/projects/[id]', 'page');
  revalidatePath('/admin/sites/[id]', 'page');
};
const siteId = (form: FormData) => {
  const id = String(form.get('site_id') ?? '');
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new UserError('This website could not be found.');
  return id;
};

export const addReference = safe(async (form) => {
  const user = await requireUser();
  const kind = form.get('kind') === 'competitor' ? 'competitor' : 'inspiration';
  const url = normaliseWebsite(text(form, 'url', { required: true, label: 'the web address', max: 500 }));
  const notes = text(form, 'notes', { label: 'notes', max: 1000 });
  await withUser(user, (db) =>
    db.query(`insert into site_references (site_id, kind, url, notes, added_by) values ($1, $2, $3, $4, $5)`, [siteId(form), kind, url, notes, user.id]),
  ).catch((e) => {
    if (e?.code === '23505') throw new UserError('That website is already on the list.');
    throw e;
  });
  refresh();
  return { ok: true, message: `Added ${url}.` };
});

export const removeReference = safe(async (form) => {
  const user = await requireUser();
  const r = await withUser(user, (db) => db.query(`delete from site_references where id = $1 returning id`, [String(form.get('id'))]));
  if (!r.length) throw new UserError('You can only remove links you added yourself. Ask your agency to remove this one.');
  refresh();
  return { ok: true, message: 'Removed.' };
});

export const saveWaysToPay = safe(async (form) => {
  const user = await requireUser();
  const id = siteId(form);
  const upi = form.get('upi_enabled') === 'on';
  const vpa = optional(form, 'upi_vpa', { max: 320 });
  if (upi && !vpa) throw new UserError('Please enter the shop’s UPI ID, e.g. mithaimarket@okicici.');
  if (vpa && !UPI_RE.test(vpa)) throw new UserError('That UPI ID doesn’t look right. It looks like name@bank, e.g. mithaimarket@okicici.');
  const cod = form.get('cod_enabled') === 'on';
  const codMaxRaw = optional(form, 'cod_max', { max: 20 });
  const codMax = codMaxRaw ? parseINR(codMaxRaw) : null;
  if (codMaxRaw && !codMax) throw new UserError('Please enter the cash-on-delivery limit as an amount in rupees, e.g. 5000.');
  const whatsapp = form.get('whatsapp_enabled') === 'on';
  const online = form.get('online_enabled') === 'on';
  if (!whatsapp && !upi && !cod && !online) throw new UserError('Keep at least one way for customers to pay.');
  await withUser(user, async (db) => {
    const current = await db.one<{ provider_connected_at: string | null }>(`select provider_connected_at from site_payment_settings where site_id = $1`, [id]);
    if (online && !current?.provider_connected_at) throw new UserError('Connect a payment gateway below before switching on online payments.');
    // Update first: an "insert … on conflict" would check the rules against a
    // brand-new row (without the connected gateway) and wrongly refuse.
    const values = [id, whatsapp, upi, vpa, optional(form, 'upi_payee_name', { max: 100 }), cod, codMax, online];
    const updated = await db.query(
      `update site_payment_settings set whatsapp_enabled = $2, upi_enabled = $3, upi_vpa = $4, upi_payee_name = $5,
         cod_enabled = $6, cod_max_paise = $7, online_enabled = $8 where site_id = $1 returning site_id`,
      values,
    );
    if (!updated.length) {
      await db.query(
        `insert into site_payment_settings (site_id, whatsapp_enabled, upi_enabled, upi_vpa, upi_payee_name, cod_enabled, cod_max_paise, online_enabled)
         values ($1, $2, $3, $4, $5, $6, $7, $8)`,
        values,
      );
    }
  });
  refresh();
  return { ok: true, message: 'Payment options saved. They go live on the website at its next publish.' };
});

export const saveGatewayKeys = safe(async (form) => {
  const user = await requireUser();
  const id = siteId(form);
  const provider = providerByKey(String(form.get('provider')));
  if (!provider) throw new UserError('Please choose a payment gateway.');
  const input = Object.fromEntries(provider.fields.map((f) => [f.name, String(form.get(f.name) ?? '')]));
  const parsed = parseProviderKeys(provider, input, String(form.get('mode') ?? 'test'));
  if ('error' in parsed) throw new UserError(parsed.error);
  const ciphertext = encryptSecret({ ...parsed.secrets, ...parsed.publicFields, provider: provider.key, kind: 'keys' });
  await withUser(user, (db) =>
    db.query(`select save_payment_credentials($1, $2, $3, $4, $5, $6)`, [id, provider.key, ciphertext, parsed.hint, parsed.publicId, parsed.mode]),
  );
  refresh();
  return { ok: true, message: `${provider.name} connected in ${parsed.mode} mode. The secret is stored encrypted and can’t be viewed again.` };
});

export const disconnectGateway = safe(async (form) => {
  const user = await requireUser();
  await withUser(user, (db) => db.query(`select disconnect_payment_provider($1)`, [siteId(form)]));
  refresh();
  return { ok: true, message: 'Payment gateway disconnected and its keys deleted. Online payments are off.' };
});
