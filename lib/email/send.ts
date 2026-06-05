import { Resend } from 'resend';
import { env } from '@/lib/env';
import type { ReportSummary } from '@/lib/supabase/types';

let _client: Resend | null = null;
function resend(): Resend {
  if (!_client) _client = new Resend(env.RESEND_API_KEY);
  return _client;
}

interface ReportReadyArgs {
  to: string;
  businessName: string;
  reportId: string;
  magicToken: string;
  summary: ReportSummary;
}

export async function sendReportReadyEmail(args: ReportReadyArgs) {
  const url = `${env.APP_URL}/r/${args.reportId}?t=${args.magicToken}`;
  const top = args.summary.highlights.slice(0, 5);
  const highlightHtml = top.length
    ? `<ul>${top
        .map(
          (h) =>
            `<li><strong>${escape(h.competitor_name)}</strong> ${escape(h.headline)}</li>`,
        )
        .join('')}</ul>`
    : '<p>No major changes this month — quiet competitors are good news.</p>';

  const html = `
    <div style="font-family: -apple-system, system-ui, sans-serif; color:#0f172a; max-width:560px;">
      <h2>Your ${monthLabel()} competitor report is ready</h2>
      <p>Hi ${escape(args.businessName)} — here's what's moved this month across your ${args.summary.competitor_count} tracked competitors:</p>
      ${highlightHtml}
      <p>
        <a href="${url}" style="display:inline-block;background:#0ea5e9;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;">
          View full report
        </a>
      </p>
      <p style="color:#64748b;font-size:13px;">This link is private to you. Don't forward it.</p>
    </div>
  `;

  await resend().emails.send({
    from: env.RESEND_FROM,
    to: args.to,
    subject: `Your ${monthLabel()} competitor intelligence report`,
    html,
  });
}

function monthLabel(): string {
  return new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
