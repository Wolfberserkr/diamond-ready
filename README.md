# Competitor Intelligence Reports

SaaS that emails small businesses a monthly intelligence report on their competitors: pricing changes, new promotions, new services, and recent customer complaints.

Launch vertical: local home services (HVAC contractors first). The pipeline is templated so re-targeting plumbers, electricians, landscapers, etc. is a config change rather than a code change.

## How it works

1. A small-business owner pays €99/mo via Mollie Checkout.
2. They log in via a magic link, add 3–5 competitors (website URLs).
3. The system scrapes each competitor's site with Playwright, pulls reviews from the Google Places API, and uses Claude to extract structured findings.
4. A diff against the previous month flags what's `new` / `changed` / `removed`.
5. Customer gets an email summary with a magic link to the full web report.
6. A Vercel cron at the 1st of each month regenerates every active subscriber's report.

## Stack

- Next.js 15 (App Router) on Vercel
- Supabase (Postgres + Auth + Storage)
- Mollie (subscription billing — chosen because Stripe is not available to Aruba-based merchants)
- Playwright (competitor scraping)
- Anthropic Claude (structured extraction)
- Google Places API (reviews)
- Resend (transactional email)

## Repo layout

```
app/                Next.js App Router
  page.tsx          Marketing landing
  pricing/          Pricing
  signup/           Mollie checkout entry
  dashboard/        Authed: competitors + billing
  r/[reportId]/     Public magic-link report viewer
  api/              Mollie webhook, cron, generate-report
lib/
  scrape/           Playwright runners + URL candidate selection
  reviews/          Google Places client + complaint clustering
  llm/              Claude extraction prompts
  reports/          Pipeline + month-over-month diff
  email/            Resend templates
  mollie/           Mollie client + webhook handlers
  supabase/         Server / browser / admin clients
supabase/
  migrations/       Schema + RLS
```

## Quick start

```bash
cp .env.example .env.local   # fill in keys
npm install
npx playwright install chromium

# Postgres (locally via Supabase CLI)
supabase start
supabase db reset            # applies migrations

npm run dev                  # http://localhost:3000
```

Run the suite:

```bash
npm run typecheck
npm run test
```

## End-to-end verification

1. `npm run dev`, visit `/`, click subscribe → Mollie test card → return to `/dashboard`.
2. Add two real local HVAC competitor URLs.
3. Click **Generate first report**. Watch the `reports` row flip to `ready`.
4. Open the magic-link email (Resend test inbox) → confirm pricing / promotions / services / complaints sections render.
5. Trigger the cron a second time:
   ```bash
   curl -X POST http://localhost:3000/api/cron/monthly \
     -H "x-cron-secret: $CRON_SECRET"
   ```
   A second `reports` row should be created with `change_vs_previous` flags populated against month 1.
