import { env } from '@/lib/env';

const MOLLIE_BASE = 'https://api.mollie.com/v2';

async function mollieFetch<T>(
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const { json, headers, ...rest } = init;
  const res = await fetch(`${MOLLIE_BASE}${path}`, {
    ...rest,
    headers: {
      Authorization: `Bearer ${env.MOLLIE_API_KEY}`,
      'Content-Type': 'application/json',
      ...headers,
    },
    body: json ? JSON.stringify(json) : (init.body ?? undefined),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Mollie ${res.status} on ${path}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export interface MollieCustomer {
  id: string;
  email: string;
  name?: string;
}

export interface MolliePayment {
  id: string;
  status: 'open' | 'paid' | 'failed' | 'canceled' | 'expired' | 'pending';
  customerId?: string;
  subscriptionId?: string;
  _links?: {
    checkout?: { href: string };
  };
}

export interface MollieSubscription {
  id: string;
  customerId: string;
  status: 'pending' | 'active' | 'canceled' | 'suspended' | 'completed';
  amount: { value: string; currency: string };
  interval: string;
}

export interface CreateFirstPaymentArgs {
  email: string;
  businessName: string;
  redirectUrl: string;
  webhookUrl: string;
  amount: string;
}

export async function createCustomerAndFirstPayment(args: CreateFirstPaymentArgs) {
  const customer = await mollieFetch<MollieCustomer>('/customers', {
    method: 'POST',
    json: { email: args.email, name: args.businessName },
  });

  const payment = await mollieFetch<MolliePayment>(
    `/customers/${customer.id}/payments`,
    {
      method: 'POST',
      json: {
        amount: { currency: 'EUR', value: args.amount },
        description: 'Competitor Intelligence — initial subscription payment',
        sequenceType: 'first',
        redirectUrl: args.redirectUrl,
        webhookUrl: args.webhookUrl,
        metadata: { businessName: args.businessName },
      },
    },
  );

  return { customer, payment };
}

export async function getPayment(paymentId: string) {
  return mollieFetch<MolliePayment>(`/payments/${paymentId}`);
}

export async function createRecurringSubscription(
  customerId: string,
  amount: string,
  webhookUrl: string,
) {
  return mollieFetch<MollieSubscription>(`/customers/${customerId}/subscriptions`, {
    method: 'POST',
    json: {
      amount: { currency: 'EUR', value: amount },
      interval: '1 month',
      description: 'Competitor Intelligence — monthly report',
      webhookUrl,
    },
  });
}

export async function cancelSubscription(customerId: string, subscriptionId: string) {
  return mollieFetch<MollieSubscription>(
    `/customers/${customerId}/subscriptions/${subscriptionId}`,
    { method: 'DELETE' },
  );
}
