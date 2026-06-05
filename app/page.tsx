import Link from 'next/link';

export default function Landing() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-bold tracking-tight">
        Know what your competitors did this month.
      </h1>
      <p className="mt-4 text-lg text-slate-700">
        Every month we send you a private report on what your competitors changed:
        their pricing, promotions, new services, and the complaints their customers
        are leaving on Google. No more guessing. No more checking 12 websites.
      </p>

      <section className="mt-10 grid gap-4 sm:grid-cols-2">
        <Feature title="Pricing changes" body="See every price your competitors raised, lowered, or newly published." />
        <Feature title="New promotions" body="Catch their seasonal specials before your phones go quiet." />
        <Feature title="New services" body="Know when a competitor adds a service before they take your calls." />
        <Feature title="Recent complaints" body="What 1–3★ reviewers said about them in the last 30 days — sorted by theme." />
      </section>

      <section className="mt-12 rounded-2xl bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-semibold">€99 / month</h2>
        <p className="mt-2 text-slate-600">
          Track up to 5 competitors. Full report emailed on the 1st of every month.
          Cancel any time.
        </p>
        <Link
          href="/signup"
          className="mt-6 inline-block rounded-lg bg-sky-500 px-6 py-3 font-semibold text-white"
        >
          Start tracking competitors
        </Link>
      </section>
    </main>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{body}</p>
    </div>
  );
}
