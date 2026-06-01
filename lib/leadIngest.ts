import type { SupabaseClient } from "@supabase/supabase-js";
import type { ParsedYaleLead } from "@/lib/yaleEmail";

/**
 * Insert a parsed Yale lead + its job, de-duplicating by Yale ticket id so the
 * same email isn't ingested twice (important for the polling watcher).
 * Used by both the manual "Import Yale Email" action and the Gmail watcher.
 */
export async function ingestParsedLead(
  supabase: SupabaseClient,
  parsed: ParsedYaleLead,
  raw: string,
  source: "email" | "manual"
): Promise<{ created: boolean; leadId: string; customerToken: string | null }> {
  if (parsed.yale_ref_no) {
    const { data: existing } = await supabase
      .from("leads")
      .select("id, customer_token")
      .eq("yale_ref_no", parsed.yale_ref_no)
      .maybeSingle();
    if (existing) {
      return {
        created: false,
        leadId: existing.id as string,
        customerToken: (existing.customer_token as string) ?? null,
      };
    }
  }

  const customer_token = (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, "");
  const { data: lead, error } = await supabase
    .from("leads")
    .insert({ ...parsed, source, raw_email: raw, customer_token })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  // A fresh Yale lead's next step is collecting customer documents (the
  // WhatsApp bot), so the job starts in docs_pending.
  const { error: jobError } = await supabase
    .from("jobs")
    .insert({ lead_id: lead.id, status: "docs_pending" });
  if (jobError) throw new Error(jobError.message);

  return { created: true, leadId: lead.id as string, customerToken: customer_token };
}
