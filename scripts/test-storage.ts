// Verifies the job-docs storage bucket: upload -> public URL -> fetch -> delete.
// Run: node --env-file=.env.local scripts/test-storage.ts
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// 1x1 transparent PNG
const b64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const bytes = new Uint8Array(Buffer.from(b64, "base64"));
const path = `__test__/check-${crypto.randomUUID()}.png`;

const { error: upErr } = await supabase.storage
  .from("job-docs")
  .upload(path, bytes, { contentType: "image/png" });
if (upErr) {
  console.error("UPLOAD failed:", upErr.message);
  process.exit(1);
}
console.log("upload -> ok:", path);

const { data } = supabase.storage.from("job-docs").getPublicUrl(path);
const res = await fetch(data.publicUrl);
console.log(`public  -> HTTP ${res.status} (${res.status === 200 ? "accessible" : "NOT accessible"})`);

await supabase.storage.from("job-docs").remove([path]);
console.log("remove  -> cleaned up. Storage OK.");
