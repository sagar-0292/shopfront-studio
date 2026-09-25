import 'server-only';

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing setting ${name}. See shopfront/SETUP.md.`);
  return v;
}

export const env = {
  get supabaseUrl() {
    return required('NEXT_PUBLIC_SUPABASE_URL');
  },
  get supabaseAnonKey() {
    return required('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  },
  get databaseUrl() {
    return required('DATABASE_URL');
  },
  get databaseCaCert() {
    return process.env.DATABASE_CA_CERT?.replace(/\\n/g, '\n');
  },
  get resendApiKey() {
    return process.env.RESEND_API_KEY;
  },
  get emailFrom() {
    return process.env.EMAIL_FROM ?? 'Shopfront Studio <studio@example.com>';
  },
};
