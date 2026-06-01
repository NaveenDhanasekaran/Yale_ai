"use server";

import { redirect } from "next/navigation";
import { getServiceClient } from "@/lib/supabase";
import { isGmailConfigured, runYaleInboxPoll } from "@/lib/gmail";

/** Dashboard "Check Gmail" button: poll the inbox now and report the result. */
export async function pollEmailsNow() {
  const supabase = getServiceClient();
  if (!supabase || !isGmailConfigured()) {
    redirect("/?email=notconfigured");
  }
  const summary = await runYaleInboxPoll(supabase);
  redirect(`/?email=ok&created=${summary.created}&seen=${summary.processed}`);
}
