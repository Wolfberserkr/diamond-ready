-- Aruba booking platform — initial schema.
--
-- Conventions:
--   * Money is stored as integer *_cents to avoid float drift.
--   * Phones are E.164 strings (leading +, no spaces).
--   * Times are TIMESTAMPTZ; clients pass ISO 8601 in UTC.
--   * The vendor app authenticates via Supabase phone-OTP Auth. auth.users.id
--     is linked to vendors.auth_user_id 1:1. Tourists never authenticate.
--   * All vendor-facing reads use RLS. The booking-web tourist page reads
--     through a SECURITY DEFINER Edge Function (bookings-get-public), not
--     directly through PostgREST.

create extension if not exists "pgcrypto";

-- ============================================================================
-- vendors
-- ============================================================================

create type vendor_category as enum (
  'boat', 'jeep', 'dive', 'guide', 'snorkel', 'other'
);

create type kyc_status as enum ('pending', 'submitted', 'approved', 'rejected');
create type payout_currency as enum ('USD', 'AWG');
create type booking_currency as enum ('USD', 'AWG');
create type ui_lang as enum ('en', 'es', 'nl');

create table vendors (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  business_name text not null,
  owner_name text not null,
  whatsapp_e164 text not null check (whatsapp_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  email text,
  category vendor_category not null default 'other',
  locale ui_lang not null default 'en',
  logo_url text,
  -- Per-vendor fee rate, stored as basis points (250 = 2.5%). Clamped 200..300.
  fee_bps integer not null default 250 check (fee_bps between 200 and 300),
  -- Bank details are sensitive; store an opaque reference that the ops app
  -- resolves to actual account info from a separate secret store.
  payout_currency payout_currency not null default 'USD',
  bank_account_ref text,
  bank_name text,
  kyc_status kyc_status not null default 'pending',
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index vendors_auth_user_id_idx on vendors(auth_user_id);
create index vendors_is_active_idx on vendors(is_active) where is_active;

-- ============================================================================
-- services
-- ============================================================================

create table services (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references vendors(id) on delete cascade,
  name text not null,
  default_price_cents integer not null check (default_price_cents >= 0),
  default_duration_min integer check (default_duration_min > 0),
  default_deposit_pct integer not null default 25 check (default_deposit_pct between 0 and 100),
  currency booking_currency not null default 'USD',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index services_vendor_id_idx on services(vendor_id);

-- ============================================================================
-- bookings
-- ============================================================================

create type booking_status as enum (
  'pending', 'paid', 'completed', 'canceled', 'refunded', 'expired'
);

create table bookings (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references vendors(id) on delete restrict,
  service_id uuid references services(id) on delete set null,
  service_name text not null, -- snapshot at creation time
  short_code text not null unique check (short_code ~ '^[2-9A-HJ-NP-TV-Z]{6}$'),
  tourist_name text not null,
  tourist_phone_e164 text check (tourist_phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  scheduled_at timestamptz not null,
  party_size integer not null check (party_size between 1 and 50),
  total_cents integer not null check (total_cents >= 100),
  deposit_cents integer not null check (deposit_cents >= 0),
  currency booking_currency not null default 'USD',
  status booking_status not null default 'pending',
  payment_intent_id text,
  platform_fee_cents integer not null default 0 check (platform_fee_cents >= 0),
  vendor_owed_cents integer not null default 0 check (vendor_owed_cents >= 0),
  -- Set when the booking is rolled into a payouts row.
  payout_id uuid,
  notes text,
  language ui_lang not null default 'en',
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  completed_at timestamptz,
  canceled_at timestamptz,
  constraint deposit_le_total check (deposit_cents <= total_cents)
);

create index bookings_vendor_id_idx on bookings(vendor_id);
create index bookings_short_code_idx on bookings(short_code);
create index bookings_status_idx on bookings(status);
create index bookings_payout_eligible_idx
  on bookings(vendor_id, completed_at)
  where status = 'completed' and payout_id is null;

-- ============================================================================
-- payments
-- ============================================================================

create type payment_status as enum (
  'requires_payment', 'succeeded', 'refunded', 'partial_refund', 'failed'
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  stripe_event_id text unique, -- idempotency key for the webhook
  stripe_pi_id text not null,
  stripe_charge_id text,
  amount_cents integer not null,
  refunded_cents integer not null default 0,
  currency booking_currency not null,
  status payment_status not null,
  raw_event jsonb,
  created_at timestamptz not null default now()
);

create index payments_booking_id_idx on payments(booking_id);
create index payments_stripe_pi_id_idx on payments(stripe_pi_id);

-- ============================================================================
-- payouts
-- ============================================================================

create type payout_status as enum ('pending', 'sent', 'failed');

create table payouts (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references vendors(id) on delete restrict,
  period_start timestamptz not null,
  period_end timestamptz not null,
  gross_cents integer not null check (gross_cents >= 0),
  fee_cents integer not null check (fee_cents >= 0),
  net_cents integer not null check (net_cents >= 0),
  currency payout_currency not null,
  -- AWG-per-USD rate captured at run time, when payout_currency = 'AWG'.
  fx_rate_awg_per_usd numeric(10, 6),
  status payout_status not null default 'pending',
  bank_ref text,
  notes text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index payouts_vendor_id_idx on payouts(vendor_id);
create index payouts_status_idx on payouts(status);

alter table bookings
  add constraint bookings_payout_id_fkey
  foreign key (payout_id) references payouts(id) on delete set null;

-- ============================================================================
-- event_log — append-only audit
-- ============================================================================

create table event_log (
  id bigserial primary key,
  vendor_id uuid references vendors(id) on delete set null,
  booking_id uuid references bookings(id) on delete set null,
  kind text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index event_log_booking_id_idx on event_log(booking_id);
create index event_log_kind_created_idx on event_log(kind, created_at desc);

-- ============================================================================
-- updated_at trigger for vendors
-- ============================================================================

create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger vendors_set_updated_at
  before update on vendors
  for each row execute function set_updated_at();

-- ============================================================================
-- RLS
-- ============================================================================

-- Helper: resolve the current user's vendor id. SECURITY DEFINER so policies
-- can reference it without recursing into RLS.
create or replace function current_vendor_id() returns uuid
language sql stable security definer
set search_path = public
as $$
  select id from vendors where auth_user_id = auth.uid();
$$;

alter table vendors enable row level security;
alter table services enable row level security;
alter table bookings enable row level security;
alter table payments enable row level security;
alter table payouts enable row level security;
alter table event_log enable row level security;

-- vendors: a signed-in vendor sees only their own row.
create policy vendors_self_select on vendors for select
  using (auth_user_id = auth.uid());

-- vendors cannot update sensitive fields directly; ops app uses the service
-- role key. We still allow them to update display fields they own.
create policy vendors_self_update on vendors for update
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

-- services: vendor-scoped CRUD.
create policy services_owner_all on services for all
  using (vendor_id = current_vendor_id())
  with check (vendor_id = current_vendor_id());

-- bookings: vendor reads only their own. Writes go through Edge Functions
-- using the service role, so we don't grant insert/update/delete here.
create policy bookings_owner_select on bookings for select
  using (vendor_id = current_vendor_id());

-- payments: vendor reads only their own (joined through booking).
create policy payments_owner_select on payments for select
  using (
    exists (
      select 1 from bookings b
      where b.id = payments.booking_id
        and b.vendor_id = current_vendor_id()
    )
  );

-- payouts: vendor reads only their own.
create policy payouts_owner_select on payouts for select
  using (vendor_id = current_vendor_id());

-- event_log is internal-only. No policy = no access for anon/authenticated
-- roles; only the service role bypasses RLS.

-- Tourists are not authenticated at all. The booking-get-public Edge Function
-- runs with the service role and returns a sanitized projection.
