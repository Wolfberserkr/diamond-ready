import { supabaseServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { addCompetitor, generateFirstReport, removeCompetitor } from './actions';
import type { AccountRow, CompetitorRow, ReportRow } from '@/lib/supabase/types';
import Link from 'next/link';

export default async function Dashboard() {
  const db = await supabaseServer();
  const { data: userData } = await db.auth.getUser();
  if (!userData.user) redirect('/');

  const { data: account } = await db
    .from('accounts')
    .select('*')
    .eq('owner_user_id', userData.user.id)
    .single();
  if (!account) redirect('/');

  const { data: competitors } = await db
    .from('competitors')
    .select('*')
    .eq('account_id', account.id)
    .order('added_at', { ascending: true });

  const { data: reports } = await db
    .from('reports')
    .select('*')
    .eq('account_id', account.id)
    .order('created_at', { ascending: false })
    .limit(6);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Header account={account as AccountRow} />

      <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Competitors</h2>
        <p className="mt-1 text-sm text-slate-600">
          Add up to 5 competitor websites. We'll auto-detect their Google Business listing.
        </p>

        <ul className="mt-4 divide-y divide-slate-100">
          {(competitors as CompetitorRow[] | null)?.map((c) => (
            <li key={c.id} className="flex items-center justify-between py-3">
              <div>
                <div className="font-medium">{c.name}</div>
                <div className="text-sm text-slate-500">{c.website_url}</div>
              </div>
              <form action={removeCompetitor}>
                <input type="hidden" name="id" value={c.id} />
                <button className="text-sm text-red-600 hover:underline">Remove</button>
              </form>
            </li>
          ))}
        </ul>

        {(!competitors || competitors.length < 5) && (
          <form action={addCompetitor} className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              name="name"
              required
              placeholder="Competitor name"
              className="rounded-lg border border-slate-300 px-3 py-2"
            />
            <input
              name="website_url"
              required
              type="url"
              placeholder="https://competitor.com"
              className="rounded-lg border border-slate-300 px-3 py-2"
            />
            <button
              className="col-span-full rounded-lg bg-slate-900 px-4 py-2 font-medium text-white"
              type="submit"
            >
              Add competitor
            </button>
          </form>
        )}
      </section>

      <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Reports</h2>
          {(competitors?.length ?? 0) > 0 && (
            <form action={generateFirstReport}>
              <button className="rounded-lg bg-sky-500 px-4 py-2 font-medium text-white">
                Generate report now
              </button>
            </form>
          )}
        </div>

        <ul className="mt-4 divide-y divide-slate-100">
          {(reports as ReportRow[] | null)?.map((r) => (
            <li key={r.id} className="flex items-center justify-between py-3">
              <div>
                <div className="font-medium">
                  {new Date(r.period_start).toLocaleString('en-US', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </div>
                <div className="text-sm text-slate-500">Status: {r.status}</div>
              </div>
              {r.status === 'ready' && (
                <Link
                  href={`/r/${r.id}?t=${r.magic_token}`}
                  className="text-sky-600 hover:underline"
                >
                  Open
                </Link>
              )}
            </li>
          ))}
          {(!reports || reports.length === 0) && (
            <li className="py-3 text-sm text-slate-500">No reports yet.</li>
          )}
        </ul>
      </section>
    </main>
  );
}

function Header({ account }: { account: AccountRow }) {
  return (
    <header className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold">{account.business_name}</h1>
        <div className="text-sm text-slate-500">
          Subscription: <span className="font-medium">{account.subscription_status}</span>
        </div>
      </div>
    </header>
  );
}
