// One-off: point Technician A's phone at the test number so assignment
// notifications reach it. Run: node --env-file=.env.local scripts/set-test-numbers.ts
import { createClient } from "@supabase/supabase-js";

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const { data, error } = await s
  .from("technicians")
  .update({ phone: "9176186062" })
  .eq("name", "Technician A")
  .select("name, phone")
  .single();

if (error) {
  console.error("update failed:", error.message);
  process.exit(1);
}
console.log("updated:", JSON.stringify(data));
