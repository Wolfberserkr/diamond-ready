# Aruba WhatsApp Booking & Deposit Tool — Build Plan

## Context

Aruba's tourism micro-vendors — boat tours, jeep safaris, dive operators, independent guides, snorkel rentals — already close bookings over WhatsApp. The problem isn't conversation; it's the gap between "yes I'd love to book" and money actually moving. Today that gap is filled with cash on arrival, Venmo screenshots, or nothing — which means no-shows, awkward chasing, and zero pricing power on deposits.

This tool inserts one layer of infrastructure on top of the existing WhatsApp flow: the vendor generates a short payment link inside our app, pastes the pre-formatted confirmation into the WhatsApp chat they were already having, and the tourist taps through to a mobile-first booking page to pay (deposit or full). Nothing about the vendor's sales motion changes. We monetize at 2–3% per completed booking — cost only appears when revenue does, so adoption friction is near zero.

**Launch:** in-person onboarding starting November 2026 (Aruba high season open). **Target:** 40 active vendors by April 2027. **Repo state:** the current `index.html` is an unrelated baseball-training landing page; this is effectively greenfield, and that file should be left untouched (or moved aside) when the new project lands.

### Decisions locked in this planning round
- **Payments:** Platform as merchant of record, Stripe as processor (we collect, we payout to vendors via bank transfer on a periodic schedule).
- **Tourist confirmation:** Web confirmation page only at v1 — no Twilio/WABA dependency on the critical path.
- **Discovery:** Link-only. No public directory. We are infrastructure, not a marketplace.
- **Languages at launch:** English, Spanish, Dutch (Papiamento deferred; vendors use English/Spanish in-app at v1).

---

## Architecture

Monorepo, three deployables, one Supabase project.

```
apps/
  vendor-app/      # Expo / React Native (iOS + Android)
  booking-web/     # Next.js, mobile-first tourist booking & confirm pages
  ops/             # Internal admin (Next.js) — vendor onboarding, payout runs, refunds
supabase/
  migrations/      # schema + RLS
  functions/       # Edge Functions (TypeScript / Deno)
packages/
  shared/          # Zod schemas, TS types, currency + fee math, i18n strings
```

### Stack
- **Vendor app:** Expo (React Native) — single codebase, OTA updates via EAS, push via Expo Notifications.
- **Tourist booking page:** Next.js App Router, deployed on Vercel. Stripe Payment Element. Short links under a single domain (e.g. `book.<domain>/<6-char-code>`).
- **Backend:** Supabase Postgres + Auth (phone OTP) + Edge Functions + Storage (vendor logos, optional service photos).
- **Payments:** Stripe (platform-as-MoR). PaymentIntents created server-side via Edge Function; webhooks reconcile booking status. Vendor payouts are off-Stripe — periodic bank transfers driven by the ops app.
- **Ops:** Next.js admin behind Supabase Auth + email allowlist. Manual payout runs at v1; CSV export for bank file upload.

### Data model (Supabase Postgres, all `*_cents` integers)

- `vendors` — id, business_name, owner_name, whatsapp_e164, email, locale (`en|es|nl`), category, bank_name, bank_account_ref (encrypted), kyc_status, payout_currency (`USD|AWG`), is_active, created_at
- `services` — id, vendor_id, name, default_price_cents, default_duration_min, default_deposit_pct, currency, is_active
- `bookings` — id, vendor_id, service_id (nullable for ad-hoc), short_code (unique, 6 char base32), tourist_name, tourist_phone_e164 (nullable), scheduled_at, party_size, total_cents, deposit_cents, currency, status (`pending|paid|completed|canceled|refunded|expired`), payment_intent_id, platform_fee_cents, vendor_owed_cents, notes, language, created_at, paid_at, completed_at
- `payments` — id, booking_id, stripe_pi_id, stripe_charge_id, amount_cents, currency, status, raw_event jsonb, created_at
- `payouts` — id, vendor_id, period_start, period_end, gross_cents, fee_cents, net_cents, currency, status (`pending|sent|failed`), bank_ref, sent_at
- `event_log` — id, vendor_id, booking_id, kind, payload jsonb, created_at (append-only, for support + audit)

**RLS:** vendors can only read/write their own rows; tourists never authenticate, all booking-page reads go through a public Edge Function keyed by `short_code` that returns a minimal projection.

### Edge Functions
- `bookings-create` — vendor app calls this to create a booking + short code + Stripe PaymentIntent; returns the link and a copy-paste WhatsApp template in the booking's language.
- `bookings-get-public` — booking page calls this with `short_code`, returns sanitized booking + Stripe client secret.
- `stripe-webhook` — handles `payment_intent.succeeded`, `charge.refunded`, `payment_intent.payment_failed`; updates `bookings.status`, writes `payments` row, computes `platform_fee_cents` + `vendor_owed_cents` on success.
- `bookings-complete` — vendor marks completed; locks `platform_fee_cents` and makes the booking eligible for the next payout run.
- `bookings-cancel` — vendor cancels; if paid, triggers Stripe refund (full or partial per policy).
- `payouts-run` — ops-only; aggregates eligible `completed` bookings into a `payouts` row per vendor and emits a CSV.

### Money math (single source of truth in `packages/shared`)
- `platform_fee_cents = round(deposit_or_total_paid * fee_rate)` where `fee_rate` is per-vendor (default 0.025, range 0.02–0.03 — set on the `vendors` row to support the council's "priced-in dissent" of negotiating).
- Fee accrues at `payment_intent.succeeded` but is **only locked in** at `bookings-complete`; on `canceled` or `refunded`, fee is reversed.
- All currency conversion is display-only; we charge in USD by default (tourists' cards are international) and pay vendors in their `payout_currency` using the daily reference rate captured on the payout run.

---

## Core flows

### Vendor: create + share booking
1. Open app → "+ New booking".
2. Pick service (or ad-hoc), date/time, party size, total, deposit %.
3. Tap "Create link".
4. Confirmation screen: short link, formatted WhatsApp message in vendor's locale, big "Share to WhatsApp" button (deep links via `whatsapp://send?phone=<tourist>&text=<encoded>`).
5. Vendor pastes/sends. Booking sits in `pending` until tourist pays.

### Tourist: pay
1. Tap link in WhatsApp → mobile booking page.
2. See vendor name + logo, service, date/time, party size, amount due (deposit or full), refund/cancellation policy.
3. Stripe Payment Element → pay.
4. Confirmation page: "Paid. Vendor has been notified. See you [date/time]." + add-to-calendar (.ics) + "Message vendor on WhatsApp" deep link back to the vendor's number.

### Vendor: post-payment + completion
1. Push notification on `payment_intent.succeeded`. Booking moves to `paid` in the list.
2. Day-of-service → vendor swipes "Mark completed". Fee locks in.
3. Cancellation/refund handled from booking detail screen.

### Ops: weekly payouts
1. Fridays, ops runs `payouts-run` for the week.
2. CSV downloaded, uploaded to bank portal (manual at v1 — automation deferred until volume justifies the integration).
3. Payout rows updated to `sent` with bank reference; vendor sees the payout in-app.

---

## Build sequence

**Sept (foundation):** Monorepo scaffold; Supabase schema + RLS; vendor auth (phone OTP); vendor app shell with bookings list + create flow (no payment yet); tourist booking page rendering by short code (no payment yet); shared Zod schemas + fee math with unit tests.

**Oct (payments + polish):** Stripe Connect-less integration (platform-as-MoR PaymentIntents); `stripe-webhook` + reconciliation; refund/cancel flows; push notifications; i18n for the three tourist languages + vendor app in English/Spanish; ops app for vendor onboarding + payout CSV. End-to-end test on TestFlight + Expo Go with real Stripe test cards.

**Late Oct → Nov launch:** Compliance pass (Stripe KYB for the platform entity, vendor KYC light — ID + bank details captured in ops app), TestFlight → App Store + Play Store submission early Oct to clear review by Nov; build the in-person onboarding kit (one-pager in EN/ES/Papiamento, QR to download, walk-through script); soft-launch with 5 vendors mid-Nov; full Nov push.

**Dec–Apr (scale to 40):** Vendor-refers-vendor mechanic (referred vendor's fee drops 0.5% for 3 months, referrer gets same); per-vendor mini-page (still no global directory); analytics dashboard (GMV, take rate, no-show rate, vendor retention); automate the bank payout file if volume warrants.

---

## Critical files / packages to create

- `supabase/migrations/0001_init.sql` — full schema + RLS policies above.
- `supabase/functions/bookings-create/index.ts` — booking + PaymentIntent creation; this is the hottest path, must be idempotent on `short_code` collision and on duplicate-submit.
- `supabase/functions/stripe-webhook/index.ts` — signature verification, idempotent on `stripe_event_id`, status transitions guarded by current state to prevent races.
- `packages/shared/money.ts` — fee math, currency formatting, deposit calculation. Single source of truth, unit-tested.
- `packages/shared/whatsapp.ts` — the message templates (EN/ES/NL) + the `wa.me` deep-link builder. Templates live here so the same string is what the vendor previews in-app and what the tourist sees.
- `apps/vendor-app/src/screens/NewBooking.tsx` — the 3-field create flow. The whole product lives or dies on this being faster than the vendor's current cash-on-arrival reflex.
- `apps/booking-web/app/b/[code]/page.tsx` — tourist booking page. Mobile-first, sub-second TTI on 4G, no auth, Stripe Payment Element.
- `apps/ops/` — vendor onboarding form (collect KYC + bank), payout run UI, refund console.

---

## Verification

End-to-end test before any vendor sees it:
1. **Local Stripe test mode** — `stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook`; create booking from vendor app pointed at local Supabase; pay via Stripe test card `4242…`; confirm webhook flips booking to `paid`, push fires, vendor sees it.
2. **Refund path** — issue partial refund from ops app; confirm `bookings.status` flips and `vendor_owed_cents` recomputes.
3. **Cancel before pay** — vendor cancels a `pending` booking; link 404s on tourist side.
4. **Payout run** — seed 10 `completed` bookings across 3 vendors; run `payouts-run`; verify CSV totals match `vendor_owed_cents - fee_cents` and that re-running is idempotent.
5. **i18n** — open booking page with `?lang=es` and `?lang=nl`; verify currency formatting, date formatting, and that WhatsApp templates render correctly in the vendor's locale, not the tourist's.
6. **Device matrix** — Android 10+ Chrome, iOS 16+ Safari, in-app WhatsApp browser on both. The in-app browser is where Stripe Payment Element historically breaks; explicitly test.
7. **In-person dress rehearsal** — book a real boat tour with a friendly Oranjestad vendor in late October on live Stripe, real money, ~$20 deposit. If that round-trips clean, we ship.

## Known risks (priced in, not solved)

- **Stripe KYB on the platform entity** is the longest-lead item; start in August. If Stripe declines our jurisdiction for marketplace ops, fall back to the hybrid path with WiPay/FAC — adds ~6 weeks.
- **App Store review** for a payments-adjacent app can bounce on KYC clarity; have the reviewer notes pre-written.
- **Vendor trust** is the real moat and the real risk — late or wrong payouts in week one will end the program. The Nov soft-launch with 5 friendly vendors exists specifically to absorb the first payout cycle's mistakes.
- **WhatsApp policy drift** — we're not using the Business API, so we're insulated from Meta template-approval risk, but `wa.me` link behavior could change. Mitigation: also expose a "copy link" fallback on every share surface.
