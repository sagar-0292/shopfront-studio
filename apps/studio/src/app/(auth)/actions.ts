'use server';

import { redirect } from 'next/navigation';
import { createSupabase } from '@/lib/supabase/server';
import { safe, text, UserError } from '@/lib/action';
import { appOrigin, safeNext } from '@/lib/urls';

const emailOf = (form: FormData) => {
  const email = text(form, 'email', { required: true, label: 'your email', max: 200 }).toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new UserError('That doesn’t look like an email address. Please check it.');
  return email;
};

const callback = async (next: string) => `${await appOrigin()}/auth/callback?next=${encodeURIComponent(next)}`;

export const loginWithPassword = safe(async (form) => {
  const supabase = await createSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email: emailOf(form), password: String(form.get('password') ?? '') });
  if (error) throw error;
  redirect(safeNext(form.get('next')));
});

export const sendLoginLink = safe(async (form) => {
  const email = emailOf(form);
  const supabase = await createSupabase();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: await callback(safeNext(form.get('next'))), shouldCreateUser: true },
  });
  if (error) throw error;
  return { ok: true, message: `We’ve emailed a login link to ${email}. Open it on this device to continue.` };
});

export const signUp = safe(async (form) => {
  const email = emailOf(form);
  const fullName = text(form, 'full_name', { required: true, label: 'your name', max: 120 });
  const password = String(form.get('password') ?? '');
  if (password.length < 8 || !/[a-z]/i.test(password) || !/\d/.test(password)) {
    throw new UserError('Please choose a password with at least 8 characters, including letters and numbers.');
  }
  const supabase = await createSupabase();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName }, emailRedirectTo: await callback(safeNext(form.get('next'))) },
  });
  if (error) throw error;
  if (data.session) redirect(safeNext(form.get('next')));
  return { ok: true, message: `Almost done! We’ve sent a confirmation link to ${email}. Open it to activate your account.` };
});

export const sendPasswordReset = safe(async (form) => {
  const email = emailOf(form);
  const supabase = await createSupabase();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: await callback('/auth/reset-password') });
  if (error) throw error;
  return { ok: true, message: `If ${email} has an account, a password reset link is on its way.` };
});

export const setNewPassword = safe(async (form) => {
  const password = String(form.get('password') ?? '');
  if (password.length < 8 || !/[a-z]/i.test(password) || !/\d/.test(password)) {
    throw new UserError('Please choose a password with at least 8 characters, including letters and numbers.');
  }
  if (password !== String(form.get('confirm') ?? '')) throw new UserError('The two passwords don’t match.');
  const supabase = await createSupabase();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
  return { ok: true, message: 'Your password has been changed.' };
});
