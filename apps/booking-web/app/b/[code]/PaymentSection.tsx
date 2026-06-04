"use client";

import { useEffect, useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { t, type Lang } from "@aruba/shared";

let stripePromise: Promise<Stripe | null> | null = null;
function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
    stripePromise = key ? loadStripe(key) : Promise.resolve(null);
  }
  return stripePromise;
}

interface Props {
  clientSecret: string | null;
  shortCode: string;
  lang: Lang;
}

export function PaymentSection({ clientSecret, shortCode, lang }: Props) {
  if (!clientSecret) {
    return <p className="muted" style={{ marginTop: 12 }}>{t(lang, "error.expired")}</p>;
  }
  return (
    <Elements
      stripe={getStripe()}
      options={{
        clientSecret,
        appearance: { theme: "night", labels: "floating" },
        locale: lang,
      }}
    >
      <PayForm shortCode={shortCode} lang={lang} />
    </Elements>
  );
}

function PayForm({ shortCode, lang }: { shortCode: string; lang: Lang }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);
    const { error: stripeErr } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${origin}/b/${shortCode}/paid`,
      },
    });
    if (stripeErr) {
      setError(stripeErr.message ?? "Payment failed");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <div style={{ marginTop: 12 }}>
        <PaymentElement options={{ layout: "tabs" }} />
      </div>
      <button className="pay" type="submit" disabled={!stripe || submitting}>
        {submitting ? "..." : t(lang, "booking.payDeposit")}
      </button>
      {error && <div className="error">{error}</div>}
    </form>
  );
}
