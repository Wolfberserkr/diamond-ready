import { NextRequest, NextResponse } from 'next/server';
import { generateReportForAccount } from '@/lib/reports/generate';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  if (req.headers.get('x-cron-secret') !== env.CRON_SECRET) {
    return new NextResponse('forbidden', { status: 403 });
  }
  const { accountId } = (await req.json()) as { accountId?: string };
  if (!accountId) return NextResponse.json({ error: 'missing accountId' }, { status: 400 });

  try {
    const reportId = await generateReportForAccount(accountId);
    return NextResponse.json({ reportId });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
