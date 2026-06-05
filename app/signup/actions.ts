'use server';

import { redirect } from 'next/navigation';
import { createCustomerAndFirstPayment } from '@/lib/mollie/client';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { env } from '@/lib/env';

export async function startSignup(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const businessName = String(formData.get('businessName') ?? '').trim();
  if (!email || !businessName) throw new Error('Missing email or business name');

  const db = supabaseAdmin();

  const { data: user, error: userErr } = await db.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (userErr && !userErr.message.includes('already')) throw userErr;

  const userId =
    user?.user?.id ??
    (await db.auth.admin.listUsers().then((r) => r.data.users.find((u) => u.email === email)?.id));
  if (!userId) throw new Error('Could not resolve user id');

  const { data: existing } = await db
    .from('accounts')
    .select('id, mollie_customer_id')
    .eq('owner_user_id', userId)
    .maybeSingle();

  const { customer, payment } = await createCustomerAndFirstPayment({
    email,
    businessName,
    amount: env.MOLLIE_SUBSCRIPTION_AMOUNT,
    redirectUrl: `${env.APP_URL}/dashboard?welcome=1`,
    webhookUrl: `${env.APP_URL}/api/mollie/webhook`,
  });

  if (existing) {
    await db
      .from('accounts')
      .update({ mollie_customer_id: customer.id, business_name: businessName })
      .eq('id', existing.id);
  } else {
    await db.from('accounts').insert({
      owner_user_id: userId,
      business_name: businessName,
      mollie_customer_id: customer.id,
    });
  }

  const checkout = payment._links?.checkout?.href;
  if (!checkout) throw new Error('Mollie did not return a checkout URL');
  redirect(checkout);
}
