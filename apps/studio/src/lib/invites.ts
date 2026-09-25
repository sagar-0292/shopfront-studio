import 'server-only';
import type { Db } from '@/lib/db';
import type { ActionState } from '@/lib/action';
import { UserError } from '@/lib/action';
import { appOrigin } from '@/lib/urls';
import { escapeHtml, sendEmail } from '@/lib/email';

export const CLIENT_AREAS = [
  { key: 'products', label: 'Products & categories' },
  { key: 'orders', label: 'Orders' },
  { key: 'bookings', label: 'Bookings' },
  { key: 'leads', label: 'Enquiries (leads)' },
  { key: 'content', label: 'Website text & photos' },
  { key: 'sellers', label: 'Sellers' },
  { key: 'coupons', label: 'Coupons & offers' },
  { key: 'reviews', label: 'Reviews' },
  { key: 'analytics', label: 'Analytics' },
] as const;

type InviteInput = {
  organisationId: string;
  kind: 'agency' | 'client' | 'seller';
  email: string;
  agencyRole?: 'owner' | 'team';
  clientId?: string;
  clientRole?: 'client_owner' | 'client_staff';
  permissions?: string[];
  sellerId?: string;
  inviterName: string;
  placeName: string;
};

export function cleanEmail(raw: FormDataEntryValue | null): string {
  const email = String(raw ?? '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new UserError('Please enter a valid email address.');
  return email;
}

/** Creates the invitation (the database checks the inviter is allowed), emails it, and returns the link. */
export async function createInvite(db: Db, i: InviteInput): Promise<ActionState> {
  const row = await db.one<{ token: string }>(
    `select token from create_invitation($1, $2, $3, $4, $5, $6, $7, $8)`,
    [i.organisationId, i.kind, i.email, i.agencyRole ?? null, i.clientId ?? null, i.clientRole ?? null, i.permissions ?? [], i.sellerId ?? null],
  );
  const link = `${await appOrigin()}/invite/${row!.token}`;
  const sent = await sendEmail(
    i.email,
    `${i.inviterName} invited you to ${i.placeName}`,
    `<p>Hello,</p><p>${escapeHtml(i.inviterName)} has invited you to join <strong>${escapeHtml(i.placeName)}</strong> on Shopfront Studio.</p>
     <p><a href="${link}">Accept the invitation</a></p><p>This link works once and expires in 7 days.</p>`,
  );
  return {
    ok: true,
    message: sent ? `Invitation emailed to ${i.email}.` : `Invitation created. Email isn’t set up yet, so share this link with ${i.email} yourself:`,
    link,
    email: i.email,
  };
}
