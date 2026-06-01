// Verifies ingestParsedLead dedups by Yale ticket id. Run:
//   node --env-file=.env.local scripts/test-ingest-dedup.ts
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { parseYaleCallLog } from "../lib/yaleEmail.ts";
import { ingestParsedLead } from "../lib/leadIngest.ts";

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const raw = readFileSync(new URL("./sample-calllog.txt", import.meta.url), "utf8");
const p = parseYaleCallLog(raw);

const r1 = await ingestParsedLead(s, p, raw, "email");
const r2 = await ingestParsedLead(s, p, raw, "email");

console.log(`first ingest  -> created=${r1.created}`);
console.log(`second ingest -> created=${r2.created} (should be false; same as first=${r1.leadId === r2.leadId})`);

// cleanup
await s.from("leads").delete().eq("yale_ref_no", p.yale_ref_no);
console.log("cleaned up.", r1.created && !r2.created ? "Dedup OK ✓" : "DEDUP PROBLEM");
