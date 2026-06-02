import { getServiceClient } from "@/lib/supabase";
import { addTechnician } from "@/app/actions";
import { AdminShell } from "@/app/AdminShell";
import type { Technician } from "@/lib/types";
import { TechRow } from "./TechRow";

type TechRowData = Technician & { access_token: string | null };

export default async function TechniciansPage() {
  const supabase = getServiceClient();

  let technicians: TechRowData[] = [];
  if (supabase) {
    const { data } = await supabase
      .from("technicians")
      .select("id, name, phone, status, access_token")
      .order("name");
    technicians = (data ?? []) as unknown as TechRowData[];
  }

  return (
    <AdminShell active="technicians" title="Technicians">
      <form
        action={addTechnician}
        className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Name</label>
          <input
            name="name"
            required
            placeholder="Technician name"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Phone</label>
          <input
            name="phone"
            required
            placeholder="+91…"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </div>
        <button className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-800">
          + Add Technician
        </button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-slate-700">
            All Technicians ({technicians.length})
          </h2>
        </div>

        {technicians.length === 0 ? (
          <div className="px-5 py-12 text-center text-slate-500">
            No technicians yet. Add one above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Phone</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Set status</th>
                  <th className="px-5 py-3">Job link</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {technicians.map((t) => (
                  <TechRow key={t.id} tech={t} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
