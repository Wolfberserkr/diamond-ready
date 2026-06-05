import { NextRequest, NextResponse } from 'next/server';
import { handleMollieWebhook } from '@/lib/mollie/subscription';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // Mollie does not sign webhooks; we gate by a shared secret in the URL.
  if (req.nextUrl.searchParams.get('secret') !== env.MOLLIE_WEBHOOK_SECRET) {
    return new NextResponse('forbidden', { status: 403 });
  }
  const body = await req.formData();
  const id = String(body.get('id') ?? '');
  if (!id) return new NextResponse('missing id', { status: 400 });

  try {
    await handleMollieWebhook(id);
  } catch (e) {
    console.error('mollie webhook failed', e);
    return new NextResponse('error', { status: 500 });
  }
  return new NextResponse('ok');
}
