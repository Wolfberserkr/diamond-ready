function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const env = {
  get APP_URL() {
    return required('APP_URL');
  },
  get SUPABASE_URL() {
    return required('NEXT_PUBLIC_SUPABASE_URL');
  },
  get SUPABASE_ANON_KEY() {
    return required('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  },
  get SUPABASE_SERVICE_ROLE_KEY() {
    return required('SUPABASE_SERVICE_ROLE_KEY');
  },
  get MOLLIE_API_KEY() {
    return required('MOLLIE_API_KEY');
  },
  get MOLLIE_WEBHOOK_SECRET() {
    return required('MOLLIE_WEBHOOK_SECRET');
  },
  get MOLLIE_SUBSCRIPTION_AMOUNT() {
    return required('MOLLIE_SUBSCRIPTION_AMOUNT');
  },
  get RESEND_API_KEY() {
    return required('RESEND_API_KEY');
  },
  get RESEND_FROM() {
    return required('RESEND_FROM');
  },
  get ANTHROPIC_API_KEY() {
    return required('ANTHROPIC_API_KEY');
  },
  get GOOGLE_PLACES_API_KEY() {
    return required('GOOGLE_PLACES_API_KEY');
  },
  get CRON_SECRET() {
    return required('CRON_SECRET');
  },
};
