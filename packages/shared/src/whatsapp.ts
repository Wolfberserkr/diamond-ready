// WhatsApp message templates and deep-link builders.
//
// The vendor previews the exact string in the app, then either taps "Share"
// (which fires the wa.me deep link with the message pre-filled) or copies
// to clipboard and pastes manually. Either way, what the tourist reads in
// WhatsApp is generated here — never anywhere else.

import { formatMoney, type Currency } from "./money.js";
import type { Lang } from "./i18n.js";

export interface BookingMessageInput {
  vendorName: string;
  serviceName: string;
  scheduledAt: Date;
  partySize: number;
  totalCents: number;
  depositCents: number;
  currency: Currency;
  bookingUrl: string;
  lang: Lang;
}

interface Template {
  greeting: string;
  service: string;
  when: string;
  party: string;
  total: string;
  deposit: string;
  paymentLine: string;
  closing: string;
}

const TEMPLATES: Record<Lang, Template> = {
  en: {
    greeting: "Hi! Here's your booking with {vendor}:",
    service: "Service: {service}",
    when: "When: {when}",
    party: "Party size: {party}",
    total: "Total: {total}",
    deposit: "Deposit due now: {deposit}",
    paymentLine: "Tap to pay: {url}",
    closing: "See you soon!",
  },
  es: {
    greeting: "¡Hola! Aquí está tu reserva con {vendor}:",
    service: "Servicio: {service}",
    when: "Fecha y hora: {when}",
    party: "Personas: {party}",
    total: "Total: {total}",
    deposit: "Depósito a pagar: {deposit}",
    paymentLine: "Paga aquí: {url}",
    closing: "¡Nos vemos pronto!",
  },
  nl: {
    greeting: "Hoi! Hier is je boeking bij {vendor}:",
    service: "Dienst: {service}",
    when: "Wanneer: {when}",
    party: "Aantal personen: {party}",
    total: "Totaal: {total}",
    deposit: "Aanbetaling nu: {deposit}",
    paymentLine: "Tik om te betalen: {url}",
    closing: "Tot snel!",
  },
};

const DATE_LOCALE: Record<Lang, string> = {
  en: "en-US",
  es: "es-419",
  nl: "nl-NL",
};

function fmt(s: string, vars: Record<string, string>): string {
  return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}

function formatWhen(d: Date, lang: Lang): string {
  return new Intl.DateTimeFormat(DATE_LOCALE[lang], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: lang === "en",
  }).format(d);
}

export function buildWhatsAppMessage(input: BookingMessageInput): string {
  const tmpl = TEMPLATES[input.lang];
  const lines: string[] = [
    fmt(tmpl.greeting, { vendor: input.vendorName }),
    "",
    fmt(tmpl.service, { service: input.serviceName }),
    fmt(tmpl.when, { when: formatWhen(input.scheduledAt, input.lang) }),
    fmt(tmpl.party, { party: String(input.partySize) }),
    fmt(tmpl.total, {
      total: formatMoney(input.totalCents, input.currency, input.lang),
    }),
  ];
  if (input.depositCents > 0 && input.depositCents < input.totalCents) {
    lines.push(
      fmt(tmpl.deposit, {
        deposit: formatMoney(input.depositCents, input.currency, input.lang),
      }),
    );
  }
  lines.push("", fmt(tmpl.paymentLine, { url: input.bookingUrl }), "", tmpl.closing);
  return lines.join("\n");
}

// Strip non-digits so we always feed wa.me a clean E.164-like number.
// wa.me accepts the digits without "+", so we drop it.
function cleanPhone(e164: string): string {
  return e164.replace(/\D/g, "");
}

export interface ShareLinkInput {
  toPhoneE164?: string; // optional; without it WhatsApp opens the chooser
  message: string;
}

export function buildWhatsAppShareUrl({ toPhoneE164, message }: ShareLinkInput): string {
  const encoded = encodeURIComponent(message);
  if (toPhoneE164) {
    return `https://wa.me/${cleanPhone(toPhoneE164)}?text=${encoded}`;
  }
  return `https://wa.me/?text=${encoded}`;
}

export function buildVendorChatUrl(vendorPhoneE164: string): string {
  return `https://wa.me/${cleanPhone(vendorPhoneE164)}`;
}
