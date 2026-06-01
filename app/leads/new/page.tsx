import { createLead } from "@/app/actions";
import { AdminShell } from "@/app/AdminShell";

export default function NewLeadPage() {
  return (
    <AdminShell active="dashboard" title="New Lead">
      <form
        action={createLead}
        className="max-w-2xl space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Customer name *" name="customer_name" required />
          <Field label="Phone *" name="phone" required placeholder="+91…" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Request type *</label>
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
          <a href="/" className="rounded-lg border border-slate-300 px-4 py-2 text-sm">
            Cancel
          </a>
          <button className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-700">
            Create Lead
          </button>
        </div>
      </form>
    </AdminShell>
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
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <input
        name={name}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
      />
    </div>
  );
}
