# Aruba WhatsApp Booking & Deposit Tool

WhatsApp-native booking and deposit infrastructure for Aruba's tourism micro-vendors — boat tours, jeep safaris, dive operators, independent guides, snorkel rentals. The vendor pastes a payment-linked confirmation into their existing WhatsApp chat; the tourist taps through to a mobile booking page and pays. We charge 2–3% per completed booking.

The full build plan, decisions, and verification steps live in `docs/PLAN.md`.

## Repo layout

```
apps/
  vendor-app/      Expo / React Native — vendor mobile app (iOS + Android)
  booking-web/     Next.js — tourist-facing booking and confirmation pages
  ops/             Next.js — internal admin (vendor onboarding, payouts, refunds)
supabase/
  migrations/      Postgres schema + RLS
  functions/       Edge Functions (Deno / TypeScript)
packages/
  shared/          Zod schemas, fee math, WhatsApp templates, i18n strings
```

## Quick start

```bash
# Install (npm workspaces)
npm install

# Run the shared-package tests (fee math, template generation, validators)
npm run test:shared

# Typecheck everything
npm run typecheck

# Local Supabase + Edge Functions
supabase start
supabase functions serve

# Tourist booking page
npm run dev -w apps/booking-web

# Vendor app (Expo)
npm run start -w apps/vendor-app
```

Copy `.env.example` to `.env` and fill in Supabase + Stripe keys before running anything that touches the network.

## Decisions baked into v1

- **Platform as merchant of record**, Stripe as processor. Vendor payouts are off-Stripe (weekly bank transfer via ops CSV).
- **Web confirmation page only** for tourist receipt — no Twilio/WhatsApp Business API on the critical path.
- **Link-only discovery.** No public vendor directory. We are infrastructure, not a marketplace.
- **Languages:** EN / ES / NL for the tourist page; EN / ES for the vendor app at launch.

## Launch window

In-person vendor onboarding starts November 2026. Target: 40 active vendors by April 2027.
