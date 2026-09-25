import { unstable_rethrow } from 'next/navigation';
import { friendlyError } from '@/lib/errors';

export type ActionState = {
  ok?: boolean;
  error?: string;
  message?: string;
  link?: string;
  email?: string;
};

/** Wraps a server action so every failure becomes a plain-language message. */
export function safe(fn: (form: FormData) => Promise<ActionState | void>) {
  return async (_prev: ActionState, form: FormData): Promise<ActionState> => {
    try {
      return (await fn(form)) ?? { ok: true };
    } catch (e) {
      unstable_rethrow(e); // let Next.js redirects pass through
      return { error: friendlyError(e) };
    }
  };
}

export class UserError extends Error {
  code = 'SF001';
}

export function text(form: FormData, key: string, { max = 500, required = false, label = key } = {}) {
  const v = String(form.get(key) ?? '').trim();
  if (required && !v) throw new UserError(`Please fill in ${label}.`);
  if (v.length > max) throw new UserError(`${label[0].toUpperCase() + label.slice(1)} is too long (max ${max} characters).`);
  return v;
}

export function optional(form: FormData, key: string, opts: { max?: number; label?: string } = {}) {
  return text(form, key, opts) || null;
}
