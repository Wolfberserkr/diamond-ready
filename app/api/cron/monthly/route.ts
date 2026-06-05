import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { generateReportForAccount } from '@/lib/reports/generate';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  if (req.headers.get('x-cron-secret') !== env.CRON_SECRET) {
    return new NextResponse('forbidden', { status: 403 });
  }

  const db = supabaseAdmin();
  const { data: active, error } = await db
    .from('accounts')
    .select('id')
    .eq('subscription_status', 'active');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results: { account_id: string; ok: boolean; error?: string }[] = [];
  for (const a of active ?? []) {
    try {
      await generateReportForAccount(a.id);
      results.push({ account_id: a.id, ok: true });
    } catch (e) {
      results.push({
        account_id: a.id,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
  return NextResponse.json({ processed: results.length, results });
}
