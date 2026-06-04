// i18n strings, three languages. Tourist booking page covers en/es/nl.
// Vendor app covers en/es. Papiamento deferred to a later release.

export type Lang = "en" | "es" | "nl";
export const SUPPORTED_LANGS: readonly Lang[] = ["en", "es", "nl"] as const;

export function isLang(value: unknown): value is Lang {
  return typeof value === "string" && (SUPPORTED_LANGS as readonly string[]).includes(value);
}

export type StringKey =
  | "booking.title"
  | "booking.payNow"
  | "booking.payDeposit"
  | "booking.amountDue"
  | "booking.total"
  | "booking.deposit"
  | "booking.partySize"
  | "booking.when"
  | "booking.cancelPolicy"
  | "booking.cancelPolicyBody"
  | "paid.title"
  | "paid.body"
  | "paid.addToCalendar"
  | "paid.messageVendor"
  | "error.notFound"
  | "error.expired"
  | "error.alreadyPaid";

type Bundle = Record<StringKey, string>;

const en: Bundle = {
  "booking.title": "Confirm your booking",
  "booking.payNow": "Pay now",
  "booking.payDeposit": "Pay deposit",
  "booking.amountDue": "Amount due",
  "booking.total": "Total",
  "booking.deposit": "Deposit",
  "booking.partySize": "Party size",
  "booking.when": "When",
  "booking.cancelPolicy": "Cancellation",
  "booking.cancelPolicyBody":
    "Free cancellation up to 24 hours before. Within 24 hours, the deposit is non-refundable.",
  "paid.title": "You're booked.",
  "paid.body": "Your vendor has been notified.",
  "paid.addToCalendar": "Add to calendar",
  "paid.messageVendor": "Message vendor on WhatsApp",
  "error.notFound": "This booking link is no longer valid.",
  "error.expired": "This booking has expired. Please ask your vendor for a new link.",
  "error.alreadyPaid": "This booking is already paid. See you soon!",
};

const es: Bundle = {
  "booking.title": "Confirma tu reserva",
  "booking.payNow": "Pagar ahora",
  "booking.payDeposit": "Pagar depósito",
  "booking.amountDue": "Monto a pagar",
  "booking.total": "Total",
  "booking.deposit": "Depósito",
  "booking.partySize": "Personas",
  "booking.when": "Cuándo",
  "booking.cancelPolicy": "Cancelación",
  "booking.cancelPolicyBody":
    "Cancelación gratuita hasta 24 horas antes. Dentro de las 24 horas, el depósito no es reembolsable.",
  "paid.title": "¡Reserva confirmada!",
  "paid.body": "Ya avisamos al proveedor.",
  "paid.addToCalendar": "Añadir al calendario",
  "paid.messageVendor": "Escribir al proveedor por WhatsApp",
  "error.notFound": "Este enlace ya no es válido.",
  "error.expired": "Esta reserva ha caducado. Pide al proveedor un nuevo enlace.",
  "error.alreadyPaid": "Esta reserva ya está pagada. ¡Nos vemos pronto!",
};

const nl: Bundle = {
  "booking.title": "Bevestig je boeking",
  "booking.payNow": "Nu betalen",
  "booking.payDeposit": "Aanbetaling doen",
  "booking.amountDue": "Te betalen",
  "booking.total": "Totaal",
  "booking.deposit": "Aanbetaling",
  "booking.partySize": "Aantal personen",
  "booking.when": "Wanneer",
  "booking.cancelPolicy": "Annulering",
  "booking.cancelPolicyBody":
    "Gratis annuleren tot 24 uur van tevoren. Binnen 24 uur is de aanbetaling niet-terugbetaalbaar.",
  "paid.title": "Je boeking staat.",
  "paid.body": "We hebben de aanbieder ingelicht.",
  "paid.addToCalendar": "Aan agenda toevoegen",
  "paid.messageVendor": "Aanbieder berichten op WhatsApp",
  "error.notFound": "Deze boekingslink is niet meer geldig.",
  "error.expired": "Deze boeking is verlopen. Vraag je aanbieder om een nieuwe link.",
  "error.alreadyPaid": "Deze boeking is al betaald. Tot snel!",
};

const BUNDLES: Record<Lang, Bundle> = { en, es, nl };

export function t(lang: Lang, key: StringKey): string {
  return BUNDLES[lang][key];
}
