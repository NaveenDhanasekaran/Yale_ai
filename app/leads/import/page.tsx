import Link from "next/link";
import { ingestYaleEmail } from "@/app/actions";

export default function ImportEmailPage() {
  return (
    <div className="min-h-full w-full bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <h1 className="text-lg font-semibold">Import Yale Email</h1>
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-800">
            ← Back to dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <p className="mb-4 text-sm text-slate-600">
          Paste the full Yale <strong>CALL LOG</strong> email below (forwarded headers
          and signature are fine — they’re ignored). We’ll read the customer, ticket,
          product and address automatically and create a lead.
        </p>

        <form
          action={ingestYaleEmail}
          className="space-y-4 rounded-xl border border-slate-200 bg-white p-6"
        >
          <textarea
            name="raw_email"
            required
            rows={16}
            placeholder="Paste the Yale CALL LOG email here…"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs focus:border-slate-500 focus:outline-none"
          />
          <div className="flex justify-end gap-3">
            <Link
              href="/"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
            >
              Cancel
            </Link>
            <button className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-700">
              Parse &amp; Create Lead
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
