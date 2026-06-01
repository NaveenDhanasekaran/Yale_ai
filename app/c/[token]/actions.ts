"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceClient } from "@/lib/supabase";
import { matchZone, type ZoneRow } from "@/lib/assign";
import { isWhatsAppConfigured, notifyOwner, sendText } from "@/lib/whatsapp";

const BUCKET = "job-docs";

async function upload(supabase: SupabaseClient, leadId: string, file: File, kind: string) {
  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const path = `customer/${leadId}/${kind}-${crypto.randomUUID()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: file.type || undefined });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function submitCustomerDocs(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const supabase = getServiceClient();
  if (!supabase) throw new Error("Server not configured.");

  const { data: lead } = await supabase
    .from("leads")
    .select("id, customer_name, request_type, address, area")
    .eq("customer_token", token)
    .maybeSingle();
  if (!lead) throw new Error("Invalid link.");

  const issue_description = String(formData.get("issue_description") ?? "").trim() || null;
  const preferred_date = String(formData.get("preferred_date") ?? "").trim() || null;
  const preferred_time = String(formData.get("preferred_time") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const map_url = String(formData.get("map_url") ?? "").trim() || null;
  const lat = formData.get("lat") ? Number(formData.get("lat")) : null;
  const lng = formData.get("lng") ? Number(formData.get("lng")) : null;

  const invoice = formData.get("invoice");
  const media = formData
    .getAll("media")
    .filter((f): f is File => f instanceof File && f.size > 0);

  const invoice_url =
    invoice instanceof File && invoice.size > 0
      ? await upload(supabase, lead.id, invoice, "invoice")
      : null;
  const media_urls: string[] = [];
  for (const m of media) media_urls.push(await upload(supabase, lead.id, m, "media"));

  await supabase.from("customer_docs").insert({
    lead_id: lead.id,
    invoice_url,
    issue_description,
    preferred_date: preferred_date || null,
    preferred_time,
    notes,
    media_urls,
  });

  await supabase.from("leads").update({ cust_lat: lat, cust_lng: lng, map_url }).eq("id", lead.id);

  // Auto-assign the job to a technician whose zone covers this address.
  const { data: job } = await supabase
    .from("jobs")
    .select("id")
    .eq("lead_id", lead.id)
    .maybeSingle();

  if (job) {
    const { data: zonesData } = await supabase
      .from("zones")
      .select("area, technician:technicians(id, name, status)");
    const zones = (zonesData ?? []) as unknown as ZoneRow[];
    const match = matchZone(`${lead.area ?? ""} ${lead.address ?? ""}`, zones);
    const tech =
      match?.technician && match.technician.status !== "off" ? match.technician : null;

    if (tech) {
      const now = new Date();
      await supabase
        .from("jobs")
        .update({
          status: "assigned_pending",
          technician_id: tech.id,
          assigned_at: now.toISOString(),
          accept_deadline: new Date(now.getTime() + 10 * 60 * 1000).toISOString(),
        })
        .eq("id", job.id);

      if (isWhatsAppConfigured()) {
        try {
          const { data: t } = await supabase
            .from("technicians")
            .select("phone, access_token")
            .eq("id", tech.id)
            .single();
          if (t?.phone && t?.access_token) {
            const base = process.env.APP_URL || "http://localhost:3000";
            await sendText(
              t.phone,
              `🔔 New job assigned to you. Tap to view and Accept within 10 minutes:\n${base}/t/${t.access_token}`
            );
          }
        } catch {
          // ignore notification failure
        }
      }
      await notifyOwner(
        `✅ ${lead.customer_name} submitted documents — auto-assigned to ${tech.name}.`
      );
    } else {
      await supabase.from("jobs").update({ status: "ready_to_assign" }).eq("id", job.id);
      await notifyOwner(`✅ ${lead.customer_name} submitted documents — ready to assign.`);
    }
  }

  revalidatePath("/");
  redirect(`/c/${token}?done=1`);
}
