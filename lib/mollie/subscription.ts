import { supabaseAdmin } from '@/lib/supabase/admin';
import type { SubscriptionStatus } from '@/lib/supabase/types';
import {
  createRecurringSubscription,
  getPayment,
  type MolliePayment,
} from './client';
import { env } from '@/lib/env';

/**
 * Mollie webhook handler. Mollie POSTs only an `id` (a payment id);
 * we look it up, then advance the account based on its status.
 */
export async function handleMollieWebhook(paymentId: string) {
  const payment = await getPayment(paymentId);
  if (!payment.customerId) return;

  const db = supabaseAdmin();

  const { data: account } = await db
    .from('accounts')
    .select('id, mollie_customer_id, mollie_subscription_id, subscription_status')
    .eq('mollie_customer_id', payment.customerId)
    .maybeSingle();

  if (!account) return;

  const status = mapMollieStatus(payment);

  // First successful payment: open the recurring subscription.
  if (payment.status === 'paid' && !account.mollie_subscription_id) {
    const sub = await createRecurringSubscription(
      payment.customerId,
      env.MOLLIE_SUBSCRIPTION_AMOUNT,
      `${env.APP_URL}/api/mollie/webhook`,
    );
    await db
      .from('accounts')
      .update({
        mollie_subscription_id: sub.id,
        subscription_status: 'active',
      })
      .eq('id', account.id);
    return;
  }

  await db.from('accounts').update({ subscription_status: status }).eq('id', account.id);
}

function mapMollieStatus(payment: MolliePayment): SubscriptionStatus {
  switch (payment.status) {
    case 'paid':
      return 'active';
    case 'pending':
    case 'open':
      return 'pending';
    case 'failed':
    case 'expired':
      return 'past_due';
    case 'canceled':
      return 'canceled';
    default:
      return 'pending';
  }
}
