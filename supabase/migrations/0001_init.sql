-- Competitor Intelligence Reports — initial schema.

create extension if not exists "pgcrypto";

create type subscription_status as enum ('pending', 'active', 'past_due', 'canceled');
create type report_status as enum ('generating', 'ready', 'failed');
create type report_section as enum ('pricing', 'promotions', 'new_services', 'complaints');
create type change_flag as enum ('new', 'changed', 'unchanged', 'removed');
create type scrape_status as enum ('success', 'partial', 'failed');

create table accounts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  business_name text not null,
  vertical text not null default 'home_services_hvac',
  mollie_customer_id text unique,
  mollie_subscription_id text unique,
  subscription_status subscription_status not null default 'pending',
  created_at timestamptz not null default now()
);
create index accounts_owner_idx on accounts (owner_user_id);

create table competitors (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts (id) on delete cascade,
  name text not null,
  website_url text not null,
  google_place_id text,
  active boolean not null default true,
  added_at timestamptz not null default now()
);
create index competitors_account_idx on competitors (account_id);

create table scrape_runs (
  id uuid primary key default gen_random_uuid(),
  competitor_id uuid not null references competitors (id) on delete cascade,
  run_at timestamptz not null default now(),
  status scrape_status not null,
  raw_html_storage_path text,
  error text
);
create index scrape_runs_competitor_idx on scrape_runs (competitor_id, run_at desc);

create table reports (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts (id) on delete cascade,
  period_start timestamptz not null,
  period_end timestamptz not null,
  status report_status not null default 'generating',
  magic_token text not null unique,
  summary_json jsonb,
  created_at timestamptz not null default now()
);
create index reports_account_idx on reports (account_id, created_at desc);

create table report_findings (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports (id) on delete cascade,
  competitor_id uuid not null references competitors (id) on delete cascade,
  section report_section not null,
  payload_json jsonb not null,
  change_vs_previous change_flag not null default 'unchanged'
);
create index report_findings_report_idx on report_findings (report_id);
create unique index report_findings_unique on report_findings (report_id, competitor_id, section);

-- Storage bucket for raw scraped HTML (private).
insert into storage.buckets (id, name, public)
values ('competitor-html', 'competitor-html', false)
on conflict (id) do nothing;

-- RLS: each authed user can only touch their own account and its descendants.
alter table accounts enable row level security;
alter table competitors enable row level security;
alter table reports enable row level security;
alter table report_findings enable row level security;
alter table scrape_runs enable row level security;

create policy "accounts owner read" on accounts
  for select using (owner_user_id = auth.uid());

create policy "competitors owner crud" on competitors
  for all using (
    exists (select 1 from accounts a where a.id = competitors.account_id and a.owner_user_id = auth.uid())
  ) with check (
    exists (select 1 from accounts a where a.id = competitors.account_id and a.owner_user_id = auth.uid())
  );

create policy "reports owner read" on reports
  for select using (
    exists (select 1 from accounts a where a.id = reports.account_id and a.owner_user_id = auth.uid())
  );

create policy "report_findings owner read" on report_findings
  for select using (
    exists (
      select 1 from reports r
      join accounts a on a.id = r.account_id
      where r.id = report_findings.report_id and a.owner_user_id = auth.uid()
    )
  );

create policy "scrape_runs owner read" on scrape_runs
  for select using (
    exists (
      select 1 from competitors c
      join accounts a on a.id = c.account_id
      where c.id = scrape_runs.competitor_id and a.owner_user_id = auth.uid()
    )
  );
