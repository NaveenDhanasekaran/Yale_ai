"use server";

import { revalidatePath } from "next/cache";
import { getServiceClient } from "@/lib/supabase";
import { geminiReadSerial } from "@/lib/gemini";
import { sendCompletionReport } from "@/lib/report";
import { notifyOwner, sendImage } from "@/lib/whatsapp";
import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "job-docs";

async function getTech(token: string) {
  const supabase = getServiceClient();
  if (!supabase) throw new Error("Server is not configured.");
  const { data: tech } = await supabase
    .from("technicians")
    .select("id, name")
    .eq("access_token", token)
    .maybeSingle();
  if (!tech) throw new Error("Invalid or expired link.");
  return { supabase, tech: tech as { id: string; name: string } };
}

// Make sure the job belongs to the technician who owns this token.
async function assertOwnsJob(supabase: SupabaseClient, techId: string, jobId: string) {
  const { data: job } = await supabase
    .from("jobs")
    .select("id, technician_id, status")
    .eq("id", jobId)
    .maybeSingle();
  if (!job || job.technician_id !== techId) throw new Error("This job isn't assigned to you.");
  return job as { id: string; technician_id: string; status: string };
}

export async function techAccept(token: string, jobId: string) {
  const { supabase, tech } = await getTech(token);
  await assertOwnsJob(supabase, tech.id, jobId);
  const { error } = await supabase
    .from("jobs")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", jobId);
  if (error) throw new Error(error.message);
  await notifyOwner(`👍 ${tech.name} accepted the job.`);

  // Forward the customer's invoice + door photos to the technician on WhatsApp.
  try {
    const { data: jb } = await supabase
      .from("jobs")
      .select("lead_id, technician:technicians(phone)")
      .eq("id", jobId)
      .single();
    const phone = (jb as { technician?: { phone?: string } } | null)?.technician?.phone;
    const leadId = (jb as { lead_id?: string } | null)?.lead_id;
    if (phone && leadId) {
      const { data: docs } = await supabase
        .from("customer_docs")
        .select("invoice_url, media_urls")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (docs?.invoice_url) await sendImage(phone, docs.invoice_url, "Customer invoice");
      for (const u of docs?.media_urls ?? []) await sendImage(phone, u, "Customer photo");
    }
  } catch {
    // ignore forwarding failures
  }

  revalidatePath(`/t/${token}`);
  revalidatePath("/");
}

/** Reject → release the job back to the office for reassignment. */
export async function techReject(token: string, jobId: string) {
  const { supabase, tech } = await getTech(token);
  await assertOwnsJob(supabase, tech.id, jobId);
  const { error } = await supabase
    .from("jobs")
    .update({
      status: "ready_to_assign",
      technician_id: null,
      assigned_at: null,
      accept_deadline: null,
    })
    .eq("id", jobId);
  if (error) throw new Error(error.message);
  revalidatePath(`/t/${token}`);
  revalidatePath("/");
}

export async function techReached(
  token: string,
  jobId: string,
  lat: number | null,
  lng: number | null
) {
  const { supabase, tech } = await getTech(token);
  await assertOwnsJob(supabase, tech.id, jobId);
  const { error } = await supabase
    .from("jobs")
    .update({
      status: "reached",
      reached_at: new Date().toISOString(),
      reached_lat: lat,
      reached_lng: lng,
    })
    .eq("id", jobId);
  if (error) throw new Error(error.message);
  revalidatePath(`/t/${token}`);
  revalidatePath("/");
}

/** Cancel a job that can't be completed → flagged for the office. */
export async function techCancel(token: string, jobId: string) {
  const { supabase, tech } = await getTech(token);
  await assertOwnsJob(supabase, tech.id, jobId);
  const { error } = await supabase
    .from("jobs")
    .update({ status: "cancelled", cancel_reason: "Cancelled by technician" })
    .eq("id", jobId);
  if (error) throw new Error(error.message);
  revalidatePath(`/t/${token}`);
  revalidatePath("/");
}

/** Work done: upload completion docs to storage, save them, mark completed + GPS. */
export async function techComplete(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const jobId = String(formData.get("job_id") ?? "");
  const lat = formData.get("lat") ? Number(formData.get("lat")) : null;
  const lng = formData.get("lng") ? Number(formData.get("lng")) : null;

  const { supabase, tech } = await getTech(token);
  await assertOwnsJob(supabase, tech.id, jobId);

  const photos = formData
    .getAll("photos")
    .filter((f): f is File => f instanceof File && f.size > 0);
  const bill = formData.get("bill");
  const serial = formData.get("serial");

  if (photos.length === 0) {
    throw new Error("Please add at least one work-completion photo.");
  }

  const uploadOne = async (file: File, kind: string) => {
    const ext = (file.name.split(".").pop() || "bin").toLowerCase();
    const path = `${jobId}/${kind}-${crypto.randomUUID()}.${ext}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: file.type || undefined, upsert: false });
    if (error) throw new Error(`Upload failed: ${error.message}`);
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  };

  const completion_photo_urls: string[] = [];
  for (const p of photos) completion_photo_urls.push(await uploadOne(p, "photo"));
  const bill_url =
    bill instanceof File && bill.size > 0 ? await uploadOne(bill, "bill") : null;
  const serial_image_url =
    serial instanceof File && serial.size > 0 ? await uploadOne(serial, "serial") : null;

  const { error: docErr } = await supabase
    .from("job_docs")
    .insert({ job_id: jobId, completion_photo_urls, bill_url, serial_image_url });
  if (docErr) throw new Error(docErr.message);

  // OCR the serial number from the uploaded image (best effort, via Gemini).
  const serial_number = serial_image_url ? await geminiReadSerial(serial_image_url) : null;

  const { error } = await supabase
    .from("jobs")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      completed_lat: lat,
      completed_lng: lng,
      serial_number,
    })
    .eq("id", jobId);
  if (error) throw new Error(error.message);

  // Tell the owner, then generate + email the completion report to Yale.
  await notifyOwner(
    `✅ Work completed by ${tech.name}. Serial: ${serial_number ?? "not detected"}.`
  );
  try {
    await sendCompletionReport(supabase, jobId);
  } catch {
    // report failure shouldn't block job completion
  }

  revalidatePath(`/t/${token}`);
  revalidatePath("/");
}
