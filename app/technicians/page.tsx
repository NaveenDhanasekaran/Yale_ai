import Link from "next/link";
import { getServiceClient } from "@/lib/supabase";
import { addTechnician, setTechnicianStatus } from "@/app/actions";
import { TECH_STATUS_LABELS, type TechStatus, type Technician } from "@/lib/types";
import { DeleteTechButton } from "./DeleteTechButton";
import { CopyLinkButton } from "./CopyLinkButton";

type TechRow = Technician & { access_token: string | null };

const STATUS_STYLES: Record<TechStatus, string> = {
  available: "bg-green-100 text-green-800",
  busy: "bg-orange-100 text-orange-800",
  off: "bg-slate-200 text-slate-600",
};

const STATUSES: TechStatus[] = ["available", "busy", "off"];

export default async function TechniciansPage() {
  const supabase = getServiceClient();

  let technicians: TechRow[] = [];
  if (supabase) {
    const { data } = await supabase
      .from("technicians")
      .select("id, name, phone, status, access_token")
      .order("name");
    technicians = (data ?? []) as unknown as TechRow[];
  }

  return (
    <div className="min-h-full w-full bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <h1 className="text-lg font-semibold">Technicians</h1>
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-800">
            ← Back to dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-8 px-6 py-8">
        {/* Add technician */}
        <form
          action={addTechnician}
          className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-end"
        >
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
            <input
              name="name"
              required
              placeholder="Technician name"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-slate-700">Phone</label>
            <input
              name="phone"
              required
              placeholder="+91…"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <button className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-700">
            + Add Technician
          </button>
        </form>

        {/* Technician list */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-3">
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
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Name</th>
                    <th className="px-5 py-3">Phone</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Set status</th>
                    <th className="px-5 py-3">Job link</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {technicians.map((t) => (
                    <tr key={t.id}>
                      <td className="px-5 py-4 font-medium">{t.name}</td>
                      <td className="px-5 py-4">{t.phone}</td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[t.status]}`}
                        >
                          {TECH_STATUS_LABELS[t.status]}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-1">
                          {STATUSES.filter((s) => s !== t.status).map((s) => (
                            <form key={s} action={setTechnicianStatus}>
                              <input type="hidden" name="id" value={t.id} />
                              <input type="hidden" name="status" value={s} />
                              <button className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100">
                                {TECH_STATUS_LABELS[s]}
                              </button>
                            </form>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <CopyLinkButton token={t.access_token} />
                      </td>
                      <td className="px-5 py-4">
                        <DeleteTechButton id={t.id} name={t.name} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
