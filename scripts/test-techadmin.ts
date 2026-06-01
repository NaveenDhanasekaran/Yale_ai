// Verifies add / set-status / remove technician against the live DB.
// Run: node --env-file=.env.local scripts/test-techadmin.ts
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const token = (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, "");

// add
const { data: tech, error: addErr } = await supabase
  .from("technicians")
  .insert({ name: "ZZ Test Tech", phone: "+910000000099", status: "available", access_token: token })
  .select("id, name, status")
  .single();
if (addErr) { console.error("ADD failed:", addErr.message); process.exit(1); }
console.log(`add  -> ${tech.name} (${tech.status})`);

// mark on leave
const { data: upd, error: updErr } = await supabase
  .from("technicians")
  .update({ status: "off" })
  .eq("id", tech.id)
  .select("status")
  .single();
if (updErr) { console.error("STATUS failed:", updErr.message); process.exit(1); }
console.log(`leave-> status now "${upd.status}"`);

// remove
const { error: delErr } = await supabase.from("technicians").delete().eq("id", tech.id);
if (delErr) { console.error("REMOVE failed:", delErr.message); process.exit(1); }
console.log("remove-> deleted. Technician admin operations OK.");
