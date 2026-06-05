import { startSignup } from './actions';

export default function SignupPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-3xl font-bold">Start tracking competitors</h1>
      <p className="mt-2 text-slate-600">
        €99/month, billed by Mollie. You'll land on your dashboard after payment.
      </p>

      <form action={startSignup} className="mt-8 space-y-4">
        <label className="block">
          <span className="text-sm font-medium">Your business name</span>
          <input
            name="businessName"
            required
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="Acme HVAC"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Your email</span>
          <input
            name="email"
            type="email"
            required
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="you@business.com"
          />
        </label>
        <button
          type="submit"
          className="w-full rounded-lg bg-sky-500 px-6 py-3 font-semibold text-white"
        >
          Continue to payment
        </button>
      </form>
    </main>
  );
}
