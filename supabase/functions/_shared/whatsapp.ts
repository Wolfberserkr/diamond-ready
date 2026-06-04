// WhatsApp message + share-link builders for Edge Functions.
// Mirrors packages/shared/src/whatsapp.ts — keep in sync.

export type Lang = "en" | "es" | "nl";
export type Currency = "USD" | "AWG";

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

function formatMoney(cents: number, currency: Currency, lang: Lang): string {
  return new Intl.NumberFormat(DATE_LOCALE[lang], {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
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

export function buildWhatsAppMessage(input: BookingMessageInput): string {
  const tmpl = TEMPLATES[input.lang];
  const lines: string[] = [
    fmt(tmpl.greeting, { vendor: input.vendorName }),
    "",
    fmt(tmpl.service, { service: input.serviceName }),
    fmt(tmpl.when, { when: formatWhen(input.scheduledAt, input.lang) }),
    fmt(tmpl.party, { party: String(input.partySize) }),
    fmt(tmpl.total, { total: formatMoney(input.totalCents, input.currency, input.lang) }),
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

export function buildWhatsAppShareUrl(toPhoneE164: string | undefined, message: string): string {
  const encoded = encodeURIComponent(message);
  if (toPhoneE164) {
    return `https://wa.me/${toPhoneE164.replace(/\D/g, "")}?text=${encoded}`;
  }
  return `https://wa.me/?text=${encoded}`;
}
