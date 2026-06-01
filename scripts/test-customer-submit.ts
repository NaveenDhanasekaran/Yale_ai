// Simulates a customer submitting docs -> auto-assign by zone. Uses a throwaway
// lead, then cleans up. Run: node --env-file=.env.local scripts/test-customer-submit.ts
import { createClient } from "@supabase/supabase-js";
import { matchZone } from "../lib/assign.ts";

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// 0. confirm the real NANAPRAKASH lead got a customer token (for its link)
const { data: nana } = await s
  .from("leads")
  .select("customer_token")
  .eq("yale_ref_no", "YLS300526125")
  .maybeSingle();
console.log("NANAPRAKASH customer link token:", nana?.customer_token ? "present ✓" : "MISSING");

// 1. throwaway lead + job in a covered area
const token = (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, "");
const { data: lead } = await s
  .from("leads")
  .insert({
    customer_name: "CUST TEST",
    phone: "+910000000077",
    request_type: "installation",
    address: "12 Beach Rd, KOTTIVAKKAM, CHENNAI 600041",
    source: "manual",
    customer_token: token,
  })
  .select("id, address, area")
  .single();
const { data: job } = await s
  .from("jobs")
  .insert({ lead_id: lead.id, status: "docs_pending" })
  .select("id")
  .single();

// 2. simulate the customer submit
await s.from("customer_docs").insert({
  lead_id: lead.id,
  preferred_date: "2026-06-10",
  preferred_time: "10:30",
  notes: "gate code 1234",
  media_urls: [],
});
await s.from("leads").update({ cust_lat: 12.9698, cust_lng: 80.2548 }).eq("id", lead.id);

// 3. auto-assign by zone
const { data: zonesData } = await s.from("zones").select("area, technician:technicians(id, name, status)");
const match = matchZone(`${lead.address ?? ""}`, zonesData as any);
const tech = match?.technician && match.technician.status !== "off" ? match.technician : null;
if (tech) {
  const now = new Date();
  await s
    .from("jobs")
    .update({
      status: "assigned_pending",
      technician_id: tech.id,
      assigned_at: now.toISOString(),
      accept_deadline: new Date(now.getTime() + 600000).toISOString(),
    })
    .eq("id", job.id);
}

// 4. verify
const { data: finalJob } = await s
  .from("jobs")
  .select("status, technician:technicians(name)")
  .eq("id", job.id)
  .single();
const { data: docs } = await s
  .from("customer_docs")
  .select("preferred_date, preferred_time")
  .eq("lead_id", lead.id);
console.log("matched technician:", tech?.name ?? "none");
console.log("job:", JSON.stringify(finalJob), "| docs:", JSON.stringify(docs));

// 5. cleanup
await s.from("leads").delete().eq("id", lead.id);
console.log(
  "cleaned up.",
  finalJob?.status === "assigned_pending" && tech ? "Customer submit + auto-assign OK ✓" : "CHECK ABOVE"
);
