import type { ReactNode } from "react";
import Link from "next/link";
import {
  Briefcase,
  Inbox,
  Clock,
  CheckCircle2,
  RefreshCw,
  Mail,
  Plus,
} from "lucide-react";
import { getServiceClient } from "@/lib/supabase";
import { assignTechnician, setJobStatus } from "@/app/actions";
import { pollEmailsNow } from "@/app/poll-actions";
import { matchZone, type ZoneRow } from "@/lib/assign";
import { CopyLink } from "@/app/CopyLink";
import { AdminShell } from "@/app/AdminShell";
import {
  STATUS_LABELS,
  type JobRow,
  type JobStatus,
  type Technician,
} from "@/lib/types";

const STATUS_STYLES: Record<JobStatus, string> = {
  new: "bg-muted text-muted-foreground",
  docs_pending: "bg-amber-100 text-amber-800",
  ready_to_assign: "bg-blue-100 text-blue-800",
  assigned_pending: "bg-purple-100 text-purple-800",
  accepted: "bg-indigo-100 text-indigo-800",
  reached: "bg-cyan-100 text-cyan-800",
  working: "bg-orange-100 text-orange-800",
  completed: "bg-emerald-100 text-emerald-800",
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

const btnOutline =
  "inline-flex h-9 items-center gap-2 rounded-md border border-border bg-surface px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-muted";
const btnPrimary =
  "inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3.5 text-sm font-medium text-primary-foreground transition hover:opacity-90";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const supabase = getServiceClient();

  const headerActions = (
    <>
      <form action={pollEmailsNow}>
        <button className={btnOutline}>
          <RefreshCw className="h-4 w-4" strokeWidth={2} />
          Check Gmail
        </button>
      </form>
      <Link href="/leads/import" className={btnOutline}>
        <Mail className="h-4 w-4" strokeWidth={2} />
        Import Email
      </Link>
      <Link href="/leads/new" className={btnPrimary}>
        <Plus className="h-4 w-4" strokeWidth={2} />
        New Lead
      </Link>
    </>
  );

  if (!supabase) {
    return (
      <AdminShell active="dashboard" title="Dashboard">
        <SetupNotice reason="env" />
      </AdminShell>
    );
  }

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
    return (
      <AdminShell active="dashboard" title="Dashboard">
        <SetupNotice reason="schema" detail={jobsRes.error.message} />
      </AdminShell>
    );
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
    <AdminShell active="dashboard" title="Dashboard" action={headerActions}>
      {sp.email === "ok" && (
        <div className="mb-6 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-foreground">
          <span className="text-accent">✓</span> Checked Gmail — created {sp.created ?? 0} new lead(s)
          from {sp.seen ?? 0} email(s).
        </div>
      )}
      {sp.email === "notconfigured" && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          Gmail isn’t connected. Add <code>GMAIL_USER</code> and <code>GMAIL_APP_PASSWORD</code>.
        </div>
      )}

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total Jobs" value={jobs.length} icon={<Briefcase className="h-4 w-4 text-muted-foreground" strokeWidth={2} />} />
        <Stat label="Unassigned" value={unassigned} icon={<Inbox className="h-4 w-4 text-muted-foreground" strokeWidth={2} />} />
        <Stat label="In Progress" value={inProgress} icon={<Clock className="h-4 w-4 text-muted-foreground" strokeWidth={2} />} />
        <Stat label="Completed" value={completed} icon={<CheckCircle2 className="h-4 w-4 text-muted-foreground" strokeWidth={2} />} />
      </div>

      {/* Jobs */}
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2 className="font-serif text-lg">All Jobs</h2>
          <span className="text-xs text-muted-foreground">{jobs.length} total</span>
        </div>

        {jobs.length === 0 ? (
          <div className="px-5 py-16 text-center text-sm text-muted-foreground">
            No jobs yet. New Yale emails arrive automatically, or click{" "}
            <span className="font-medium text-foreground">“New Lead”</span>.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Area</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Technician</th>
                  <th className="px-5 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
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
                    <tr key={job.id} className="align-top transition-colors hover:bg-muted/40">
                      <td className="px-5 py-4">
                        <div className="font-medium text-foreground">
                          {job.lead?.customer_name ?? "—"}
                        </div>
                        <div className="text-xs text-muted-foreground">{job.lead?.phone}</div>
                        <div className="text-xs text-muted-foreground/70">{fmt(job.created_at)}</div>
                        <div className="mt-1.5">
                          <CopyLink
                            token={job.lead?.customer_token ?? null}
                            prefix="/c/"
                            label="Customer link"
                          />
                        </div>
                      </td>
                      <td className="px-5 py-4 capitalize text-muted-foreground">
                        {job.lead?.request_type}
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">{job.lead?.area ?? "—"}</td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[job.status]}`}
                        >
                          {STATUS_LABELS[job.status]}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-foreground">
                        {job.technician?.name ?? (
                          <span className="text-muted-foreground">Unassigned</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {!job.technician ? (
                          availableTechs.length > 0 ? (
                            <form action={assignTechnician} className="flex items-center gap-2">
                              <input type="hidden" name="job_id" value={job.id} />
                              <select
                                name="technician_id"
                                defaultValue={suggestedTech?.id ?? ""}
                                className="h-8 rounded-md border border-border bg-surface px-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                              >
                                <option value="" disabled>
                                  Select technician…
                                </option>
                                {availableTechs.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {suggestedTech?.id === t.id ? `★ ${t.name} (suggested)` : t.name}
                                  </option>
                                ))}
                              </select>
                              <button className="h-8 rounded-md bg-accent px-3 text-xs font-medium text-accent-foreground transition hover:opacity-90">
                                Assign
                              </button>
                            </form>
                          ) : (
                            <span className="text-xs text-muted-foreground">No technicians</span>
                          )
                        ) : (
                          <div className="flex items-center gap-2">
                            {next && (
                              <form action={setJobStatus}>
                                <input type="hidden" name="job_id" value={job.id} />
                                <input type="hidden" name="status" value={next} />
                                <button className="h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition hover:opacity-90">
                                  → {STATUS_LABELS[next]}
                                </button>
                              </form>
                            )}
                            {isOpen && (
                              <form action={setJobStatus}>
                                <input type="hidden" name="job_id" value={job.id} />
                                <input type="hidden" name="status" value="cancelled" />
                                <button className="h-8 rounded-md border border-border px-3 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                                  Cancel
                                </button>
                              </form>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5 transition-colors hover:border-accent/40">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        {icon}
      </div>
      <div className="mt-3 font-serif text-3xl text-foreground">{value}</div>
    </div>
  );
}

function SetupNotice({ reason, detail }: { reason: "env" | "schema"; detail?: string }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
      <h2 className="text-base font-semibold text-amber-900">⚙️ Finish setup</h2>
      {reason === "env" ? (
        <p className="mt-2 text-sm text-amber-800">
          Supabase isn’t connected. Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code>SUPABASE_SERVICE_ROLE_KEY</code> in your environment.
        </p>
      ) : (
        <div className="mt-2 space-y-1 text-sm text-amber-800">
          <p>
            Connected, but tables are missing — run <code>supabase/schema.sql</code>.
          </p>
          {detail && <p className="text-xs text-amber-600">Details: {detail}</p>}
        </div>
      )}
    </div>
  );
}
