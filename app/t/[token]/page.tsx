import type { ReactNode } from "react";
import { getServiceClient } from "@/lib/supabase";
import { JobCard, type TechJob } from "./JobCard";

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full w-full bg-slate-100">
      <div className="mx-auto max-w-md px-4 py-6">{children}</div>
    </div>
  );
}

function Msg({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
      <h2 className="text-base font-semibold text-slate-800">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{body}</p>
    </div>
  );
}

export default async function TechPortal({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = getServiceClient();

  if (!supabase) {
    return (
      <Shell>
        <Msg title="Not configured" body="The server isn't set up yet." />
      </Shell>
    );
  }

  const { data: tech } = await supabase
    .from("technicians")
    .select("id, name")
    .eq("access_token", token)
    .maybeSingle();

  if (!tech) {
    return (
      <Shell>
        <Msg
          title="Invalid link"
          body="This link isn't valid. Please ask the office to resend your job link."
        />
      </Shell>
    );
  }

  const { data: jobsData } = await supabase
    .from("jobs")
    .select(
      "id, status, accept_deadline, created_at, lead:leads(customer_name, phone, address, area, request_type, product_details, customer_remarks)"
    )
    .eq("technician_id", tech.id)
    .in("status", ["assigned_pending", "accepted", "reached", "working"])
    .order("created_at", { ascending: true });

  const jobs = (jobsData ?? []) as unknown as TechJob[];

  return (
    <Shell>
      <div className="mb-4">
        <h1 className="text-xl font-bold text-slate-900">Hi {tech.name} 👋</h1>
        <p className="text-sm text-slate-500">
          {jobs.length} active job{jobs.length === 1 ? "" : "s"}
        </p>
      </div>

      {jobs.length === 0 ? (
        <Msg
          title="No active jobs"
          body="You'll get a WhatsApp message when a new job is assigned to you."
        />
      ) : (
        <div className="space-y-4">
          {jobs.map((j) => (
            <JobCard key={j.id} token={token} job={j} />
          ))}
        </div>
      )}
    </Shell>
  );
}
