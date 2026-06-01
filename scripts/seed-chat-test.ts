// Seeds a test lead mid-conversation (at the "date" step) for the WhatsApp bot demo.
// Run: node --env-file=.env.local scripts/seed-chat-test.ts
import { createClient } from "@supabase/supabase-js";

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// clean any prior test lead
await s.from("leads").delete().eq("customer_name", "Naveen Test");

const token = (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, "");
const { data: lead } = await s
  .from("leads")
  .insert({
    customer_name: "Naveen Test",
    phone: "9176186062",
    request_type: "installation",
    address: "KOTTIVAKKAM, CHENNAI 600041",
    source: "manual",
    customer_token: token,
    chat_state: "date",
  })
  .select("id")
  .single();
await s.from("customer_docs").insert({ lead_id: lead.id, media_urls: [] });
await s.from("jobs").insert({ lead_id: lead.id, status: "docs_pending" });

console.log("seeded test lead", lead.id, "at chat_state=date, phone 9176186062");
