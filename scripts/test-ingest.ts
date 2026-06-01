// End-to-end ingest check against the live DB (inserts then deletes a test lead).
// Run: node --env-file=.env.local scripts/test-ingest.ts
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { parseYaleCallLog } from "../lib/yaleEmail.ts";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const raw = readFileSync(new URL("./sample-calllog.txt", import.meta.url), "utf8");
const p = parseYaleCallLog(raw);

const { data: lead, error } = await supabase
  .from("leads")
  .insert({ ...p, source: "email", raw_email: raw })
  .select("*")
  .single();
if (error) {
  console.error("Lead insert FAILED:", error.message);
  process.exit(1);
}

const { error: jobErr } = await supabase
  .from("jobs")
  .insert({ lead_id: lead.id, status: "docs_pending" });
if (jobErr) {
  console.error("Job insert FAILED:", jobErr.message);
  await supabase.from("leads").delete().eq("id", lead.id);
  process.exit(1);
}

console.log("Inserted lead + job:");
console.log(`  ${lead.customer_name} | ${lead.yale_ref_no} | ${lead.request_type}`);
console.log(`  reg=${lead.registration_date} dop=${lead.dop} pincode=${lead.pincode}`);
console.log(`  ${lead.product_details}`);

// Clean up so the test DB stays tidy (job cascades on lead delete).
await supabase.from("leads").delete().eq("id", lead.id);
console.log("Cleaned up. Full email->lead->job path OK.");
