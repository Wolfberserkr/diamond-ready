import { notFound } from "next/navigation";
import {
  buildVendorChatUrl,
  formatMoney,
  isValidShortCode,
  t,
  type Lang,
} from "@aruba/shared";
import { fetchBooking } from "@/lib/fetchBooking";
import { PaymentSection } from "./PaymentSection";

const DATE_LOCALE: Record<Lang, string> = {
  en: "en-US",
  es: "es-419",
  nl: "nl-NL",
};

interface PageProps {
  params: { code: string };
}

export default async function BookingPage({ params }: PageProps) {
  if (!isValidShortCode(params.code)) return notFound();
  const booking = await fetchBooking(params.code);
  if (!booking) return notFound();

  const lang = (booking.lang ?? "en") as Lang;

  if (booking.status === "paid" || booking.status === "completed") {
    return (
      <main className="shell">
        <div className="card">
          <p>{t(lang, "error.alreadyPaid")}</p>
          <div className="cta-row">
            <a className="primary" href={buildVendorChatUrl(booking.vendor.whatsappE164)}>
              {t(lang, "paid.messageVendor")}
            </a>
          </div>
        </div>
      </main>
    );
  }
  if (
    booking.status === "canceled" ||
    booking.status === "expired" ||
    booking.status === "refunded"
  ) {
    return (
      <main className="shell">
        <div className="card">
          <p>{t(lang, "error.notFound")}</p>
        </div>
      </main>
    );
  }

  const when = new Intl.DateTimeFormat(DATE_LOCALE[lang], {
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: lang === "en",
  }).format(new Date(booking.scheduledAt));

  return (
    <main className="shell">
      <div className="card">
        <div className="vendor-name">{booking.vendor.businessName}</div>
        <div className="service-name">{booking.serviceName}</div>

        <div className="detail-row">
          <span className="label">{t(lang, "booking.when")}</span>
          <span className="value">{when}</span>
        </div>
        <div className="detail-row">
          <span className="label">{t(lang, "booking.partySize")}</span>
          <span className="value">{booking.partySize}</span>
        </div>
        <div className="detail-row">
          <span className="label">{t(lang, "booking.total")}</span>
          <span className="value">
            {formatMoney(booking.totalCents, booking.currency, lang)}
          </span>
        </div>

        <div className="amount-due">
          <span className="label">{t(lang, "booking.amountDue")}</span>
          <span className="value">
            {formatMoney(booking.depositCents, booking.currency, lang)}
          </span>
        </div>

        <PaymentSection
          clientSecret={booking.stripeClientSecret}
          shortCode={booking.shortCode}
          lang={lang}
        />

        <div className="policy">
          <strong>{t(lang, "booking.cancelPolicy")}.</strong>{" "}
          {t(lang, "booking.cancelPolicyBody")}
        </div>
      </div>
    </main>
  );
}
