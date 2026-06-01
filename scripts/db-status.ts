// Prints current row counts + any leads. Run:
//   node --env-file=.env.local scripts/db-status.ts
import { createClient } from "@supabase/supabase-js";

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

for (const t of ["technicians", "zones", "leads", "jobs", "job_docs"]) {
  const { count } = await s.from(t).select("*", { count: "exact", head: true });
  console.log(`${t.padEnd(12)} ${count ?? 0}`);
}

const { data: leads } = await s
  .from("leads")
  .select("customer_name, source, yale_ref_no")
  .order("created_at", { ascending: false });
if (leads && leads.length) {
  console.log("\nleads:");
  for (const l of leads) console.log(`  - ${l.customer_name} (${l.source}, ${l.yale_ref_no ?? "no ref"})`);
}
