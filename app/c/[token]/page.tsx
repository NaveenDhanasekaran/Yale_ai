import type { ReactNode } from "react";
import { getServiceClient } from "@/lib/supabase";
import type { RequestType } from "@/lib/types";
import { CustomerForm } from "./CustomerForm";
import { ChatAssistant } from "./ChatAssistant";

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full w-full bg-slate-100">
      <div className="mx-auto max-w-md px-4 py-6">{children}</div>
    </div>
  );
}

function Card({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-6">{children}</div>;
}

export default async function CustomerPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  const supabase = getServiceClient();

  if (!supabase) {
    return (
      <Shell>
        <Card>
          <p className="text-sm text-slate-600">The service isn’t set up yet.</p>
        </Card>
      </Shell>
    );
  }

  const { data: lead } = await supabase
    .from("leads")
    .select("customer_name, request_type")
    .eq("customer_token", token)
    .maybeSingle();

  if (!lead) {
    return (
      <Shell>
        <Card>
          <h1 className="text-base font-semibold text-slate-800">Invalid link</h1>
          <p className="mt-1 text-sm text-slate-500">
            This link isn’t valid. Please contact MLV Enterprise.
          </p>
        </Card>
      </Shell>
    );
  }

  if (sp.done) {
    return (
      <Shell>
        <Card>
          <h1 className="text-lg font-semibold text-green-700">Thank you! ✅</h1>
          <p className="mt-2 text-sm text-slate-600">
            We’ve received your details, {lead.customer_name}. Our team will confirm your
            visit shortly. You can close this page.
          </p>
        </Card>
      </Shell>
    );
  }

  const requestType = lead.request_type as RequestType;

  return (
    <Shell>
      <div className="mb-4">
        <h1 className="text-xl font-bold text-slate-900">Hi {lead.customer_name} 👋</h1>
        <p className="mt-1 text-sm text-slate-600">
          This is <strong>MLV Enterprise</strong> regarding your Yale{" "}
          <strong>{requestType}</strong> service request. Please share a few details below so
          we can schedule your visit.
        </p>
      </div>
      <ChatAssistant
        token={token}
        greeting={`Hi ${lead.customer_name}! I'm the MLV Enterprise assistant. I'll help schedule your Yale ${requestType}. Please share the details using the form below, and pick a date — ask me anything!`}
      />

      <Card>
        <CustomerForm token={token} requestType={requestType} />
      </Card>
    </Shell>
  );
}
