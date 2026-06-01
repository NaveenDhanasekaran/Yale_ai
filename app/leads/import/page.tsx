import { ingestYaleEmail } from "@/app/actions";
import { AdminShell } from "@/app/AdminShell";

export default function ImportEmailPage() {
  return (
    <AdminShell active="dashboard" title="Import Yale Email">
      <div className="max-w-2xl">
        <p className="mb-4 text-sm text-slate-500">
          Paste the full Yale <strong>CALL LOG</strong> email below (forwarded headers and
          signature are fine — they’re ignored). We’ll read the customer, ticket, product and
          address automatically and create a lead.
        </p>

        <form
          action={ingestYaleEmail}
          className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <textarea
            name="raw_email"
            required
            rows={16}
            placeholder="Paste the Yale CALL LOG email here…"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs focus:border-slate-500 focus:outline-none"
          />
          <div className="flex justify-end gap-3">
            <a href="/" className="rounded-lg border border-slate-300 px-4 py-2 text-sm">
              Cancel
            </a>
            <button className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-700">
              Parse &amp; Create Lead
            </button>
          </div>
        </form>
      </div>
    </AdminShell>
  );
}
