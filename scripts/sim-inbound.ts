// Simulates inbound WhatsApp messages to the local webhook and checks the result.
// Requires `npm run dev` running. Run:
//   node --env-file=.env.local scripts/sim-inbound.ts
import { createClient } from "@supabase/supabase-js";

const base = "http://localhost:3000";
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// wait for the dev server
let ready = false;
for (let i = 0; i < 60; i++) {
  try {
    await fetch(`${base}/api/whatsapp`);
    ready = true;
    break;
  } catch {
    await delay(2000);
  }
}
console.log("server ready:", ready);

const post = (text: string) =>
  fetch(`${base}/api/whatsapp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      entry: [{ changes: [{ value: { messages: [{ from: "919176186062", type: "text", text: { body: text } }] } }] }],
    }),
  }).then((r) => r.text());

console.log("msg1 (tomorrow 10am):", await post("tomorrow 10am"));
await delay(2000);
console.log("msg2 (yes):", await post("yes"));
await delay(2500);

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);
const { data: lead } = await s
  .from("leads")
  .select("id, chat_state")
  .eq("customer_name", "Naveen Test")
  .maybeSingle();
const { data: docs } = await s
  .from("customer_docs")
  .select("preferred_time")
  .eq("lead_id", lead?.id)
  .maybeSingle();
const { data: job } = await s
  .from("jobs")
  .select("status, technician:technicians(name)")
  .eq("lead_id", lead?.id)
  .maybeSingle();

console.log(`\nfinal -> chat_state=${lead?.chat_state} | date="${docs?.preferred_time}" | job=${JSON.stringify(job)}`);
