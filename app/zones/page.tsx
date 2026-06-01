import Link from "next/link";
import { getServiceClient } from "@/lib/supabase";
import { addZone, removeZone } from "@/app/actions";
import type { Technician } from "@/lib/types";

interface ZoneRow {
  id: string;
  area: string;
  technician: { id: string; name: string } | null;
}

export default async function ZonesPage() {
  const supabase = getServiceClient();

  let zones: ZoneRow[] = [];
  let technicians: Technician[] = [];
  if (supabase) {
    const [z, t] = await Promise.all([
      supabase.from("zones").select("id, area, technician:technicians(id, name)").order("area"),
      supabase.from("technicians").select("id, name, phone, status").order("name"),
    ]);
    zones = (z.data ?? []) as unknown as ZoneRow[];
    technicians = (t.data ?? []) as unknown as Technician[];
  }

  return (
    <div className="min-h-full w-full bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold">Service Zones</h1>
            <p className="text-sm text-slate-500">Map an area to the technician who covers it</p>
          </div>
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-800">
            ← Back to dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-8 px-6 py-8">
        <form
          action={addZone}
          className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-end"
        >
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-slate-700">Area</label>
            <input
              name="area"
              required
              placeholder="e.g. Kottivakkam"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-slate-700">Technician</label>
            <select
              name="technician_id"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              defaultValue=""
            >
              <option value="">— Unassigned —</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <button className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-700">
            + Add / Update
          </button>
        </form>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-3">
            <h2 className="text-sm font-semibold text-slate-700">Zones ({zones.length})</h2>
          </div>
          {zones.length === 0 ? (
            <div className="px-5 py-12 text-center text-slate-500">No zones yet. Add one above.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Area</th>
                  <th className="px-5 py-3">Technician</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {zones.map((z) => (
                  <tr key={z.id}>
                    <td className="px-5 py-4 font-medium">{z.area}</td>
                    <td className="px-5 py-4">
                      {z.technician?.name ?? <span className="text-slate-400">Unassigned</span>}
                    </td>
                    <td className="px-5 py-4">
                      <form action={removeZone}>
                        <input type="hidden" name="id" value={z.id} />
                        <button className="rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50">
                          Remove
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
