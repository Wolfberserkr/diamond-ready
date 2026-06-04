import { notFound } from "next/navigation";
import { buildVendorChatUrl, isValidShortCode, t, type Lang } from "@aruba/shared";
import { fetchBooking } from "@/lib/fetchBooking";

interface PageProps {
  params: { code: string };
}

function icsForBooking(args: {
  uid: string;
  vendorName: string;
  serviceName: string;
  scheduledAt: string;
}): string {
  const dt = new Date(args.scheduledAt);
  const stamp = dt.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Aruba Booking//EN",
    "BEGIN:VEVENT",
    `UID:${args.uid}@aruba-booking`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${stamp}`,
    `SUMMARY:${args.serviceName} — ${args.vendorName}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export default async function PaidPage({ params }: PageProps) {
  if (!isValidShortCode(params.code)) return notFound();
  const booking = await fetchBooking(params.code);
  if (!booking) return notFound();

  const lang = (booking.lang ?? "en") as Lang;
  const icsHref =
    "data:text/calendar;charset=utf-8," +
    encodeURIComponent(
      icsForBooking({
        uid: booking.shortCode,
        vendorName: booking.vendor.businessName,
        serviceName: booking.serviceName,
        scheduledAt: booking.scheduledAt,
      }),
    );

  return (
    <main className="shell">
      <div className="card" style={{ textAlign: "center" }}>
        <div className="success-icon">✓</div>
        <h1 style={{ margin: "8px 0" }}>{t(lang, "paid.title")}</h1>
        <p className="muted">{t(lang, "paid.body")}</p>
        <div className="cta-row">
          <a
            className="primary"
            href={buildVendorChatUrl(booking.vendor.whatsappE164)}
          >
            {t(lang, "paid.messageVendor")}
          </a>
          <a className="secondary" href={icsHref} download={`booking-${booking.shortCode}.ics`}>
            {t(lang, "paid.addToCalendar")}
          </a>
        </div>
      </div>
    </main>
  );
}
