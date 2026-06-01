// Verifies zone matching against the real NANAPRAKASH lead. Adds a Kottivakkam
// zone (left in place so it shows on the dashboard). Run:
//   node --env-file=.env.local scripts/test-assign.ts
import { createClient } from "@supabase/supabase-js";
import { matchZone } from "../lib/assign.ts";

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const { data: techA } = await s
  .from("technicians")
  .select("id, name")
  .eq("name", "Technician A")
  .single();

await s.from("zones").upsert({ area: "Kottivakkam", technician_id: techA.id }, { onConflict: "area" });
console.log(`zone upserted: Kottivakkam -> ${techA.name}`);

const { data: lead } = await s
  .from("leads")
  .select("customer_name, address, area")
  .eq("yale_ref_no", "YLS300526125")
  .maybeSingle();
const addressText = lead
  ? `${lead.area ?? ""} ${lead.address ?? ""}`
  : "NO-15, KOTTIVAKKAM, CHENNAI, 600041, TN";
console.log("lead address:", addressText.trim());

const { data: zones } = await s.from("zones").select("area, technician:technicians(id, name, status)");
const match = matchZone(addressText, zones);
console.log(`\nmatched zone: "${match?.area}" -> suggested technician: ${match?.technician?.name ?? "none"}`);
