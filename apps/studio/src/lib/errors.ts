// Turns any error into a sentence a shop owner can understand.
// Messages written for people in the database (code SF001) are shown as-is.

type MaybeDbError = { code?: string; message?: string; constraint?: string; status?: number };

const constraintMessages: Record<string, string> = {
  sites_organisation_id_slug_key: 'Another project already uses that web address. Try a different one.',
  organisations_slug_key: 'That web address is already taken. Try a different agency name.',
  organisation_members_pkey: 'That person is already on your team.',
  client_members_pkey: 'That person already has a login for this business.',
};

const authMessages: Record<string, string> = {
  invalid_credentials: 'That email and password don’t match. Check them, or log in with an email link instead.',
  email_not_confirmed: 'Please confirm your email first. We’ve sent you a link — check your inbox (and spam folder).',
  user_already_exists: 'An account with this email already exists. Try logging in instead.',
  weak_password: 'Please choose a stronger password: at least 8 characters, with letters and numbers.',
  over_email_send_rate_limit: 'We’ve sent a few emails already. Please wait a minute and try again.',
  over_request_rate_limit: 'Too many attempts. Please wait a minute and try again.',
  otp_expired: 'That link has expired or was already used. Please request a new one.',
  same_password: 'Your new password must be different from the old one.',
  signup_disabled: 'New sign-ups are switched off. Ask your agency for an invitation.',
};

export function friendlyError(e: unknown): string {
  const err = (e ?? {}) as MaybeDbError & { name?: string };
  if (err.code === 'SF001' && err.message) return err.message;
  if (err.code && authMessages[err.code]) return authMessages[err.code];
  if (err.constraint && constraintMessages[err.constraint]) return constraintMessages[err.constraint];
  switch (err.code) {
    case '42501':
      return 'You don’t have permission to do that. If you think you should, ask your agency owner.';
    case '23505':
      return 'That already exists. Please use a different name or email.';
    case '23503':
      return 'That item is linked to something that no longer exists. Refresh the page and try again.';
    case '23514':
    case '22P02':
    case '22001':
      return 'Some details aren’t in the right format. Please check what you entered.';
    case 'ECONNREFUSED':
    case '57P01':
    case '53300':
      return 'We couldn’t reach the database just now. Please try again in a minute.';
  }
  if (err.name === 'AuthRetryableFetchError') return 'We couldn’t reach the login service. Check your internet and try again.';
  console.error('Unexpected error', e);
  return 'Something went wrong on our side. Please try again — if it keeps happening, tell your agency.';
}
