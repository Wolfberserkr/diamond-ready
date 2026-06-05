import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type {
  CompetitorRow,
  FindingPayload,
  ReportFindingRow,
  ReportRow,
  ReportSection,
} from '@/lib/supabase/types';

interface PageProps {
  params: Promise<{ reportId: string }>;
  searchParams: Promise<{ t?: string }>;
}

export default async function ReportPage({ params, searchParams }: PageProps) {
  const { reportId } = await params;
  const { t } = await searchParams;
  if (!t) notFound();

  const db = supabaseAdmin();
  const { data: report } = await db
    .from('reports')
    .select('*')
    .eq('id', reportId)
    .eq('magic_token', t)
    .maybeSingle();
  if (!report || report.status !== 'ready') notFound();
  const typedReport = report as ReportRow;

  const { data: account } = await db
    .from('accounts')
    .select('business_name')
    .eq('id', typedReport.account_id)
    .single();

  const { data: competitorsData } = await db
    .from('competitors')
    .select('*')
    .eq('account_id', typedReport.account_id);
  const competitors = (competitorsData ?? []) as CompetitorRow[];
  const competitorById = new Map(competitors.map((c) => [c.id, c]));

  const { data: findingsData } = await db
    .from('report_findings')
    .select('*')
    .eq('report_id', reportId);
  const findings = (findingsData ?? []) as ReportFindingRow[];

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header>
        <div className="text-sm uppercase tracking-wide text-sky-600">
          Competitor Intelligence
        </div>
        <h1 className="text-3xl font-bold">
          {account?.business_name ?? 'Your'} —{' '}
          {new Date(typedReport.period_start).toLocaleString('en-US', {
            month: 'long',
            year: 'numeric',
          })}
        </h1>
      </header>

      {competitors.map((c) => (
        <section
          key={c.id}
          className="mt-8 rounded-2xl bg-white p-6 shadow-sm"
        >
          <h2 className="text-xl font-semibold">{c.name}</h2>
          <a className="text-sm text-slate-500" href={c.website_url}>
            {c.website_url}
          </a>
          {(['pricing', 'promotions', 'new_services', 'complaints'] as ReportSection[]).map(
            (section) => {
              const finding = findings.find(
                (f) => f.competitor_id === c.id && f.section === section,
              );
              if (!finding) return null;
              return (
                <SectionBlock
                  key={section}
                  section={section}
                  payload={finding.payload_json}
                  flag={finding.change_vs_previous}
                />
              );
            },
          )}
        </section>
      ))}
    </main>
  );
}

function SectionBlock({
  section,
  payload,
  flag,
}: {
  section: ReportSection;
  payload: FindingPayload;
  flag: ReportFindingRow['change_vs_previous'];
}) {
  const title: Record<ReportSection, string> = {
    pricing: 'Pricing',
    promotions: 'Promotions',
    new_services: 'Services',
    complaints: 'Recent complaints',
  };
  return (
    <div className="mt-5">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold">{title[section]}</h3>
        <ChangeBadge flag={flag} />
      </div>
      <PayloadBody payload={payload} />
    </div>
  );
}

function ChangeBadge({ flag }: { flag: ReportFindingRow['change_vs_previous'] }) {
  if (flag === 'unchanged') return null;
  const style: Record<string, string> = {
    new: 'bg-emerald-100 text-emerald-800',
    changed: 'bg-amber-100 text-amber-800',
    removed: 'bg-slate-200 text-slate-700',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style[flag]}`}>
      {flag}
    </span>
  );
}

function PayloadBody({ payload }: { payload: FindingPayload }) {
  switch (payload.kind) {
    case 'pricing':
      return payload.items.length ? (
        <ul className="mt-2 text-sm">
          {payload.items.map((i, idx) => (
            <li key={idx} className="flex justify-between border-b border-slate-100 py-1">
              <span>{i.service}</span>
              <span className="font-medium">{i.price}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-slate-500">No published pricing.</p>
      );
    case 'promotions':
      return payload.items.length ? (
        <ul className="mt-2 space-y-2 text-sm">
          {payload.items.map((i, idx) => (
            <li key={idx}>
              <div className="font-medium">{i.title}</div>
              <div className="text-slate-600">{i.description}</div>
              {i.expires && <div className="text-xs text-slate-500">Expires {i.expires}</div>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-slate-500">No active promotions.</p>
      );
    case 'new_services':
      return payload.items.length ? (
        <ul className="mt-2 list-disc pl-5 text-sm">
          {payload.items.map((i, idx) => (
            <li key={idx}>{i.name}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-slate-500">No services listed.</p>
      );
    case 'complaints':
      return payload.themes.length ? (
        <ul className="mt-2 space-y-2 text-sm">
          {payload.themes.map((t, idx) => (
            <li key={idx}>
              <div className="font-medium">
                {t.theme}{' '}
                <span className="text-xs text-slate-500">({t.count} reviews)</span>
              </div>
              {t.example_quotes[0] && (
                <div className="text-slate-600">“{t.example_quotes[0]}”</div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-slate-500">
          No recent low-rated reviews in the last 30 days.
        </p>
      );
  }
}
