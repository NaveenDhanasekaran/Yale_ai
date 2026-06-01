import Link from "next/link";
import { getServiceClient } from "@/lib/supabase";
import { assignTechnician, setJobStatus } from "@/app/actions";
import { pollEmailsNow } from "@/app/poll-actions";
import { matchZone, type ZoneRow } from "@/lib/assign";
import { CopyLink } from "@/app/CopyLink";
import {
  STATUS_LABELS,
  type JobRow,
  type JobStatus,
  type Technician,
} from "@/lib/types";

const STATUS_STYLES: Record<JobStatus, string> = {
  new: "bg-slate-100 text-slate-700",
  docs_pending: "bg-amber-100 text-amber-800",
  ready_to_assign: "bg-blue-100 text-blue-800",
  assigned_pending: "bg-purple-100 text-purple-800",
  accepted: "bg-indigo-100 text-indigo-800",
  reached: "bg-cyan-100 text-cyan-800",
  working: "bg-orange-100 text-orange-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-700",
};

const NEXT_STATUS: Partial<Record<JobStatus, JobStatus>> = {
  assigned_pending: "accepted",
  accepted: "reached",
  reached: "working",
  working: "completed",
};

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const supabase = getServiceClient();
  if (!supabase) return <SetupNotice reason="env" />;

  const [jobsRes, techRes, zonesRes] = await Promise.all([
    supabase
      .from("jobs")
      .select(
        "id, status, created_at, assigned_at, accept_deadline, serial_number, lead:leads(customer_name, phone, area, address, request_type, product_details, customer_token), technician:technicians(name)"
      )
      .order("created_at", { ascending: false }),
    supabase.from("technicians").select("id, name, phone, status").order("name"),
    supabase.from("zones").select("area, technician:technicians(id, name, status)"),
  ]);

  if (jobsRes.error) {
    return <SetupNotice reason="schema" detail={jobsRes.error.message} />;
  }

  const jobs = (jobsRes.data ?? []) as unknown as JobRow[];
  const technicians = (techRes.data ?? []) as unknown as Technician[];
  const availableTechs = technicians.filter((t) => t.status !== "off");
  const zones = (zonesRes.data ?? []) as unknown as ZoneRow[];

  const unassigned = jobs.filter((j) =>
    ["new", "docs_pending", "ready_to_assign"].includes(j.status)
  ).length;
  const inProgress = jobs.filter((j) =>
    ["assigned_pending", "accepted", "reached", "working"].includes(j.status)
  ).length;
  const completed = jobs.filter((j) => j.status === "completed").length;

  return (
    <div className="min-h-full w-full bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold">Yale Service — Owner Dashboard</h1>
            <p className="text-sm text-slate-500">Leads, jobs &amp; technician assignment</p>
          </div>
          <div className="flex gap-2">
            <form action={pollEmailsNow}>
              <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                ↻ Check Gmail
              </button>
            </form>
            <Link
              href="/technicians"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Technicians
            </Link>
            <Link
              href="/zones"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Zones
            </Link>
            <Link
              href="/leads/import"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Import Yale Email
            </Link>
            <Link
              href="/leads/new"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              + New Lead
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {sp.email === "ok" && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">
            ✅ Checked Gmail — created {sp.created ?? 0} new lead(s) from {sp.seen ?? 0} matching email(s).
          </div>
        )}
        {sp.email === "notconfigured" && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
            Gmail isn’t connected. Add <code>GMAIL_USER</code> and <code>GMAIL_APP_PASSWORD</code> to your env.
          </div>
        )}

        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Total Jobs" value={jobs.length} />
          <Stat label="Unassigned" value={unassigned} accent="text-blue-600" />
          <Stat label="In Progress" value={inProgress} accent="text-orange-600" />
          <Stat label="Completed" value={completed} accent="text-green-600" />
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-3">
            <h2 className="text-sm font-semibold text-slate-700">All Jobs</h2>
          </div>

          {jobs.length === 0 ? (
            <div className="px-5 py-16 text-center text-slate-500">
              No jobs yet. Click <span className="font-medium">“+ New Lead”</span> to create one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Customer</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3">Area</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Technician</th>
                    <th className="px-5 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {jobs.map((job) => {
                    const next = NEXT_STATUS[job.status];
                    const isOpen = !["completed", "cancelled"].includes(job.status);
                    const suggestedZone = !job.technician
                      ? matchZone(`${job.lead?.area ?? ""} ${job.lead?.address ?? ""}`, zones)
                      : null;
                    const suggestedTech =
                      suggestedZone?.technician && suggestedZone.technician.status !== "off"
                        ? suggestedZone.technician
                        : null;
                    return (
                      <tr key={job.id} className="align-top">
                        <td className="px-5 py-4">
                          <div className="font-medium">{job.lead?.customer_name ?? "—"}</div>
                          <div className="text-xs text-slate-500">{job.lead?.phone}</div>
                          <div className="text-xs text-slate-400">{fmt(job.created_at)}</div>
                          <div className="mt-1">
                            <CopyLink
                              token={job.lead?.customer_token ?? null}
                              prefix="/c/"
                              label="Copy customer link"
                            />
                          </div>
                        </td>
                        <td className="px-5 py-4 capitalize">{job.lead?.request_type}</td>
                        <td className="px-5 py-4">{job.lead?.area ?? "—"}</td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[job.status]}`}
                          >
                            {STATUS_LABELS[job.status]}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          {job.technician?.name ?? (
                            <span className="text-slate-400">Unassigned</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-2">
                            {!job.technician && suggestedTech && (
                              <form action={assignTechnician}>
                                <input type="hidden" name="job_id" value={job.id} />
                                <input
                                  type="hidden"
                                  name="technician_id"
                                  value={suggestedTech.id}
                                />
                                <button className="rounded bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-500">
                                  Assign → {suggestedTech.name} (suggested)
                                </button>
                              </form>
                            )}
                            {!job.technician && availableTechs.length > 0 && (
                              <form action={assignTechnician} className="flex gap-1">
                                <input type="hidden" name="job_id" value={job.id} />
                                <select
                                  name="technician_id"
                                  defaultValue=""
                                  className="rounded border border-slate-300 px-2 py-1 text-xs"
                                >
                                  <option value="" disabled>
                                    Assign…
                                  </option>
                                  {availableTechs.map((t) => (
                                    <option key={t.id} value={t.id}>
                                      {t.name} ({t.status})
                                    </option>
                                  ))}
                                </select>
                                <button className="rounded bg-slate-900 px-2 py-1 text-xs text-white hover:bg-slate-700">
                                  Go
                                </button>
                              </form>
                            )}
                            {next && (
                              <form action={setJobStatus}>
                                <input type="hidden" name="job_id" value={job.id} />
                                <input type="hidden" name="status" value={next} />
                                <button className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-500">
                                  → {STATUS_LABELS[next]}
                                </button>
                              </form>
                            )}
                            {isOpen && (
                              <form action={setJobStatus}>
                                <input type="hidden" name="job_id" value={job.id} />
                                <input type="hidden" name="status" value="cancelled" />
                                <button className="rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50">
                                  Cancel
                                </button>
                              </form>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Stat({
  label,
  value,
  accent = "text-slate-900",
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold ${accent}`}>{value}</div>
    </div>
  );
}

function SetupNotice({
  reason,
  detail,
}: {
  reason: "env" | "schema";
  detail?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
        <h1 className="text-lg font-semibold text-amber-900">⚙️ Finish setup</h1>
        {reason === "env" ? (
          <div className="mt-3 space-y-2 text-sm text-amber-800">
            <p>
              Supabase isn’t connected yet. Create a free project at{" "}
              <a className="underline" href="https://supabase.com">
                supabase.com
              </a>
              , then add a <code className="rounded bg-amber-100 px-1">.env.local</code>{" "}
              file in the project root:
            </p>
            <pre className="overflow-x-auto rounded-lg bg-amber-900/90 p-3 text-xs text-amber-50">
              {`NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key`}
            </pre>
            <p>
              See <code className="rounded bg-amber-100 px-1">.env.example</code> and{" "}
              <code className="rounded bg-amber-100 px-1">README.md</code>.
            </p>
          </div>
        ) : (
          <div className="mt-3 space-y-2 text-sm text-amber-800">
            <p>
              Connected — but the tables aren’t created yet. Open the Supabase{" "}
              <strong>SQL Editor</strong> and run{" "}
              <code className="rounded bg-amber-100 px-1">supabase/schema.sql</code>.
            </p>
            {detail && <p className="text-xs text-amber-600">Details: {detail}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
