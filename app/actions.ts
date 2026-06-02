"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServiceClient } from "@/lib/supabase";
import { parseYaleCallLog } from "@/lib/yaleEmail";
import { ingestParsedLead } from "@/lib/leadIngest";
import { isWhatsAppConfigured, notifyOwner, sendText } from "@/lib/whatsapp";
import { startCustomerChat } from "@/lib/customerBot";
import type { JobStatus, TechStatus } from "@/lib/types";

/** A long, unguessable token for a technician's WhatsApp link (used in Step 2). */
function newAccessToken(): string {
  return (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, "");
}

/** Create a lead manually and open a job for it. */
export async function createLead(formData: FormData) {
  const supabase = getServiceClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const customer_name = String(formData.get("customer_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const request_type = String(formData.get("request_type") ?? "installation");
  const area = String(formData.get("area") ?? "").trim() || null;
  const address = String(formData.get("address") ?? "").trim() || null;
  const product_details = String(formData.get("product_details") ?? "").trim() || null;
  const yale_ref_no = String(formData.get("yale_ref_no") ?? "").trim() || null;

  if (!customer_name || !phone) {
    throw new Error("Customer name and phone are required.");
  }

  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      customer_name,
      phone,
      area,
      address,
      product_details,
      yale_ref_no,
      request_type,
      source: "manual",
      customer_token: newAccessToken(),
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  const { error: jobError } = await supabase
    .from("jobs")
    .insert({ lead_id: lead.id, status: "new" });

  if (jobError) throw new Error(jobError.message);

  revalidatePath("/");
  redirect("/");
}

/** Parse a pasted Yale call-log email and create a fully-populated lead + job. */
export async function ingestYaleEmail(formData: FormData) {
  const supabase = getServiceClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const raw = String(formData.get("raw_email") ?? "").trim();
  if (!raw) throw new Error("Paste the Yale email content first.");

  const p = parseYaleCallLog(raw);
  if (!p.customer_name || !p.phone) {
    throw new Error(
      "Couldn't find the customer name or mobile in that email — check the format and try again."
    );
  }

  const result = await ingestParsedLead(supabase, p, raw, "manual");
  if (result.created) {
    await notifyOwner(
      `🔔 New lead: ${p.customer_name} — ${p.request_type}` +
        `${p.area || p.city ? ` (${p.area ?? p.city})` : ""}. Ref ${p.yale_ref_no ?? "—"}.`
    );
    await startCustomerChat(supabase, {
      id: result.leadId,
      customer_name: p.customer_name ?? "there",
      phone: p.phone ?? "",
      request_type: p.request_type,
    });
    await notifyOwner(`📨 Started WhatsApp chat with ${p.customer_name ?? "customer"} for details.`);
  }

  revalidatePath("/");
  redirect("/");
}

/** Assign a technician and start the 10-minute accept timer. */
export async function assignTechnician(formData: FormData) {
  const supabase = getServiceClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const jobId = String(formData.get("job_id") ?? "");
  const technicianId = String(formData.get("technician_id") ?? "");
  if (!jobId || !technicianId) throw new Error("Job and technician are required.");

  const now = new Date();
  const deadline = new Date(now.getTime() + 10 * 60 * 1000); // +10 minutes

  const { error } = await supabase
    .from("jobs")
    .update({
      technician_id: technicianId,
      status: "assigned_pending",
      assigned_at: now.toISOString(),
      accept_deadline: deadline.toISOString(),
    })
    .eq("id", jobId);

  if (error) throw new Error(error.message);

  // Send the technician their job link via WhatsApp (best effort).
  if (isWhatsAppConfigured()) {
    try {
      const { data: tech } = await supabase
        .from("technicians")
        .select("phone, access_token")
        .eq("id", technicianId)
        .single();
      if (tech?.phone && tech?.access_token) {
        const base = process.env.APP_URL || "http://localhost:3000";
        await sendText(
          tech.phone,
          `🔔 New job assigned to you. Tap to view and Accept within 10 minutes:\n${base}/t/${tech.access_token}`
        );
      }
    } catch {
      // ignore notification failures
    }
  }

  revalidatePath("/");
}

/** Move a job to the next status (used manually until WhatsApp drives it). */
export async function setJobStatus(formData: FormData) {
  const supabase = getServiceClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const jobId = String(formData.get("job_id") ?? "");
  const status = String(formData.get("status") ?? "") as JobStatus;
  if (!jobId || !status) throw new Error("Job and status are required.");

  const patch: Record<string, unknown> = { status };
  const nowIso = new Date().toISOString();
  if (status === "accepted") patch.accepted_at = nowIso;
  if (status === "reached") patch.reached_at = nowIso;
  if (status === "completed") patch.completed_at = nowIso;

  const { error } = await supabase.from("jobs").update(patch).eq("id", jobId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

// ---------------- Zone admin ----------------

/** Map a service area to a technician (upsert by area). */
export async function addZone(formData: FormData) {
  const supabase = getServiceClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const area = String(formData.get("area") ?? "").trim();
  const technicianId = String(formData.get("technician_id") ?? "") || null;
  if (!area) throw new Error("Area is required.");

  const { error } = await supabase
    .from("zones")
    .upsert({ area, technician_id: technicianId }, { onConflict: "area" });
  if (error) throw new Error(error.message);
  revalidatePath("/zones");
  revalidatePath("/");
}

export async function removeZone(formData: FormData) {
  const supabase = getServiceClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Zone id is required.");

  const { error } = await supabase.from("zones").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/zones");
  revalidatePath("/");
}

// ---------------- Technician admin ----------------

/** Add a new technician (auto-generates their secret link token). */
export async function addTechnician(formData: FormData) {
  const supabase = getServiceClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  if (!name || !phone) throw new Error("Name and phone are required.");

  const { error } = await supabase.from("technicians").insert({
    name,
    phone,
    status: "available",
    access_token: newAccessToken(),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/technicians");
}

/** Edit a technician's name and phone. */
export async function updateTechnician(formData: FormData) {
  const supabase = getServiceClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  if (!id || !name || !phone) throw new Error("Name and phone are required.");

  const { error } = await supabase.from("technicians").update({ name, phone }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/technicians");
  revalidatePath("/");
}

/** Remove a technician. Their jobs/zones are set to unassigned (ON DELETE SET NULL). */
export async function removeTechnician(formData: FormData) {
  const supabase = getServiceClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Technician id is required.");

  const { error } = await supabase.from("technicians").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/technicians");
}

/** Mark a technician Available / Busy / On Leave. */
export async function setTechnicianStatus(formData: FormData) {
  const supabase = getServiceClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as TechStatus;
  if (!id || !status) throw new Error("Technician and status are required.");

  const { error } = await supabase.from("technicians").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/technicians");
}
