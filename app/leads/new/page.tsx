import Link from "next/link";
import { createLead } from "@/app/actions";

export default function NewLeadPage() {
  return (
    <div className="min-h-full w-full bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <h1 className="text-lg font-semibold">New Lead</h1>
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-800">
            ← Back to dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <form
          action={createLead}
          className="space-y-5 rounded-xl border border-slate-200 bg-white p-6"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Customer name *" name="customer_name" required />
            <Field label="Phone *" name="phone" required placeholder="+91…" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Request type *
            </label>
            <select
              name="request_type"
              defaultValue="installation"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="installation">Installation</option>
              <option value="breakdown">Breakdown / Service</option>
            </select>
          </div>

          <Field label="Area" name="area" placeholder="e.g. Anna Nagar" />
          <Field label="Address" name="address" />
          <Field label="Product details" name="product_details" />
          <Field label="Yale reference no." name="yale_ref_no" />

          <div className="flex justify-end gap-3 pt-2">
            <Link
              href="/"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
            >
              Cancel
            </Link>
            <button className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-700">
              Create Lead
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

function Field({
  label,
  name,
  required,
  placeholder,
}: {
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        name={name}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
      />
    </div>
  );
}
