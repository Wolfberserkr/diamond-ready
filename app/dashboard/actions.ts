'use server';

import { revalidatePath } from 'next/cache';
import { supabaseServer } from '@/lib/supabase/server';
import { generateReportForAccount } from '@/lib/reports/generate';

async function currentAccountId() {
  const db = await supabaseServer();
  const { data: userData } = await db.auth.getUser();
  if (!userData.user) throw new Error('Not signed in');
  const { data: account } = await db
    .from('accounts')
    .select('id, subscription_status')
    .eq('owner_user_id', userData.user.id)
    .single();
  if (!account) throw new Error('No account for user');
  return account;
}

export async function addCompetitor(formData: FormData) {
  const account = await currentAccountId();
  const name = String(formData.get('name') ?? '').trim();
  const website_url = String(formData.get('website_url') ?? '').trim();
  if (!name || !website_url) throw new Error('Missing fields');

  const db = await supabaseServer();
  const { error } = await db
    .from('competitors')
    .insert({ account_id: account.id, name, website_url });
  if (error) throw error;
  revalidatePath('/dashboard');
}

export async function removeCompetitor(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const db = await supabaseServer();
  const { error } = await db.from('competitors').delete().eq('id', id);
  if (error) throw error;
  revalidatePath('/dashboard');
}

export async function generateFirstReport() {
  const account = await currentAccountId();
  if (account.subscription_status !== 'active') {
    throw new Error('Subscription is not active');
  }
  await generateReportForAccount(account.id);
  revalidatePath('/dashboard');
}
