// Simulates the whole technician flow against the live DB + storage, then cleans up.
// Run: node --env-file=.env.local scripts/test-techflow.ts
import { createClient } from "@supabase/supabase-js";

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const die = (label: string, e: { message: string } | null) => {
  if (e) {
    console.error(`${label} FAILED:`, e.message);
    process.exit(1);
  }
};

const { data: tech } = await s
  .from("technicians")
  .select("id, name")
  .eq("name", "Technician A")
  .maybeSingle();
if (!tech) die("find tech", { message: "Technician A not found" });

const { data: lead, error: leadErr } = await s
  .from("leads")
  .insert({
    customer_name: "FLOW TEST",
    phone: "+910000000088",
    request_type: "installation",
    area: "Anna Nagar",
    source: "manual",
  })
  .select("id")
  .single();
die("create lead", leadErr);

const { data: job, error: jobErr } = await s
  .from("jobs")
  .insert({
    lead_id: lead.id,
    technician_id: tech.id,
    status: "assigned_pending",
    assigned_at: new Date().toISOString(),
    accept_deadline: new Date(Date.now() + 600000).toISOString(),
  })
  .select("id")
  .single();
die("create job", jobErr);
console.log("assigned -> assigned_pending");

die("accept", (await s.from("jobs").update({ status: "accepted", accepted_at: new Date().toISOString() }).eq("id", job.id)).error);
console.log("accept   -> accepted");

die("reached", (await s.from("jobs").update({ status: "reached", reached_at: new Date().toISOString(), reached_lat: 13.0827, reached_lng: 80.2707 }).eq("id", job.id)).error);
console.log("reached  -> reached (GPS 13.0827, 80.2707)");

const b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const path = `${job.id}/photo-${crypto.randomUUID()}.png`;
die("upload", (await s.storage.from("job-docs").upload(path, new Uint8Array(Buffer.from(b64, "base64")), { contentType: "image/png" })).error);
const url = s.storage.from("job-docs").getPublicUrl(path).data.publicUrl;
die("job_docs", (await s.from("job_docs").insert({ job_id: job.id, completion_photo_urls: [url], bill_url: null, serial_image_url: null })).error);
console.log("upload   -> photo stored + job_docs row");

die("complete", (await s.from("jobs").update({ status: "completed", completed_at: new Date().toISOString(), completed_lat: 13.083, completed_lng: 80.271 }).eq("id", job.id)).error);

const { data: final } = await s
  .from("jobs")
  .select("status, reached_lat, completed_lat, doc:job_docs(completion_photo_urls)")
  .eq("id", job.id)
  .single();
console.log("complete ->", JSON.stringify(final));

// cleanup (deleting the lead cascades the job + job_docs)
await s.storage.from("job-docs").remove([path]);
await s.from("leads").delete().eq("id", lead.id);
console.log("cleaned up. Full technician flow OK ✓");
