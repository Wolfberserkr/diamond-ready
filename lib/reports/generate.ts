import { supabaseAdmin } from '@/lib/supabase/admin';
import { scrapeCompetitor } from '@/lib/scrape/runner';
import {
  extractPricing,
  extractPromotions,
  extractServices,
} from '@/lib/llm/extract';
import { fetchComplaints } from '@/lib/reviews/complaints';
import { findPlaceId } from '@/lib/reviews/places';
import { diffFindings } from './diff';
import { sendReportReadyEmail } from '@/lib/email/send';
import type {
  CompetitorRow,
  FindingPayload,
  ReportFindingRow,
  ReportSection,
  ReportSummary,
} from '@/lib/supabase/types';
import crypto from 'crypto';

export async function generateReportForAccount(accountId: string): Promise<string> {
  const db = supabaseAdmin();

  const { data: account, error: accErr } = await db
    .from('accounts')
    .select('id, owner_user_id, business_name')
    .eq('id', accountId)
    .single();
  if (accErr || !account) throw new Error(`Account not found: ${accountId}`);

  const { data: ownerUser } = await db.auth.admin.getUserById(account.owner_user_id);
  const ownerEmail = ownerUser.user?.email;

  const { data: competitors, error: cErr } = await db
    .from('competitors')
    .select('*')
    .eq('account_id', accountId)
    .eq('active', true);
  if (cErr) throw cErr;
  if (!competitors || competitors.length === 0) {
    throw new Error('Account has no active competitors');
  }

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
  const magicToken = crypto.randomBytes(24).toString('base64url');

  const { data: report, error: rErr } = await db
    .from('reports')
    .insert({
      account_id: accountId,
      period_start: periodStart,
      period_end: periodEnd,
      status: 'generating',
      magic_token: magicToken,
    })
    .select()
    .single();
  if (rErr || !report) throw rErr;

  try {
    const prevReportId = await previousReportId(accountId, report.id);
    const findings: Omit<ReportFindingRow, 'id'>[] = [];

    for (const competitor of competitors as CompetitorRow[]) {
      const scrape = await scrapeCompetitor(competitor.website_url);
      const pages = scrape.pages.map((p) => ({ url: p.url, html: p.html }));

      const [pricing, promotions, services] = await Promise.all([
        extractPricing({ competitorName: competitor.name, pages }),
        extractPromotions({ competitorName: competitor.name, pages }),
        extractServices({ competitorName: competitor.name, pages }),
      ]);

      let placeId = competitor.google_place_id;
      if (!placeId) {
        placeId = await findPlaceId(competitor.name, competitor.website_url);
        if (placeId) {
          await db
            .from('competitors')
            .update({ google_place_id: placeId })
            .eq('id', competitor.id);
        }
      }
      const complaints = placeId
        ? await fetchComplaints(competitor.name, placeId)
        : [];

      const payloads: Record<ReportSection, FindingPayload> = {
        pricing: { kind: 'pricing', items: pricing },
        promotions: { kind: 'promotions', items: promotions },
        new_services: { kind: 'new_services', items: services },
        complaints: { kind: 'complaints', themes: complaints },
      };

      const prevByCompetitorSection = prevReportId
        ? await loadPreviousFindings(prevReportId, competitor.id)
        : new Map<ReportSection, FindingPayload>();

      for (const section of Object.keys(payloads) as ReportSection[]) {
        const current = payloads[section];
        const previous = prevByCompetitorSection.get(section) ?? null;
        findings.push({
          report_id: report.id,
          competitor_id: competitor.id,
          section,
          payload_json: current,
          change_vs_previous: diffFindings(previous, current),
        });
      }
    }

    const { error: fErr } = await db.from('report_findings').insert(findings);
    if (fErr) throw fErr;

    const summary = buildSummary(competitors as CompetitorRow[], findings);

    await db
      .from('reports')
      .update({ status: 'ready', summary_json: summary })
      .eq('id', report.id);

    if (ownerEmail) {
      await sendReportReadyEmail({
        to: ownerEmail,
        businessName: account.business_name,
        reportId: report.id,
        magicToken,
        summary,
      });
    }

    return report.id;
  } catch (err) {
    await db
      .from('reports')
      .update({ status: 'failed' })
      .eq('id', report.id);
    throw err;
  }
}

async function previousReportId(accountId: string, currentReportId: string) {
  const db = supabaseAdmin();
  const { data } = await db
    .from('reports')
    .select('id')
    .eq('account_id', accountId)
    .neq('id', currentReportId)
    .eq('status', 'ready')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

async function loadPreviousFindings(
  reportId: string,
  competitorId: string,
): Promise<Map<ReportSection, FindingPayload>> {
  const db = supabaseAdmin();
  const { data } = await db
    .from('report_findings')
    .select('section, payload_json')
    .eq('report_id', reportId)
    .eq('competitor_id', competitorId);
  const map = new Map<ReportSection, FindingPayload>();
  for (const row of data ?? []) {
    map.set(row.section as ReportSection, row.payload_json as FindingPayload);
  }
  return map;
}

function buildSummary(
  competitors: CompetitorRow[],
  findings: Omit<ReportFindingRow, 'id'>[],
): ReportSummary {
  const byCompetitor = new Map(competitors.map((c) => [c.id, c.name]));
  const highlights = findings
    .filter(
      (f): f is typeof f & { change_vs_previous: 'new' | 'changed' } =>
        f.change_vs_previous === 'new' || f.change_vs_previous === 'changed',
    )
    .map((f) => ({
      competitor_id: f.competitor_id,
      competitor_name: byCompetitor.get(f.competitor_id) ?? 'Unknown',
      section: f.section,
      headline: headlineFor(f.section, f.change_vs_previous),
    }));
  return { competitor_count: competitors.length, highlights };
}

function headlineFor(
  section: ReportSection,
  flag: 'new' | 'changed',
): string {
  const verb = flag === 'new' ? 'just added' : 'updated';
  const label: Record<ReportSection, string> = {
    pricing: 'their pricing',
    promotions: 'a promotion',
    new_services: 'their services list',
    complaints: 'recurring complaint themes',
  };
  return `${verb} ${label[section]}`;
}
