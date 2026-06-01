import type { SupabaseClient } from "@supabase/supabase-js";
import { sendText, downloadMedia, normalizeMsisdn, notifyOwner } from "@/lib/whatsapp";
import { matchZone, type ZoneRow } from "@/lib/assign";
import { geminiJSON, geminiClassifyImage } from "@/lib/gemini";

const BUCKET = "job-docs";

export interface InboundMessage {
  from: string;
  type: "text" | "image" | "video" | "other";
  text?: string;
  mediaId?: string;
  mime?: string;
}

interface LeadRow {
  id: string;
  customer_name: string;
  phone: string;
  request_type: "installation" | "breakdown";
  chat_state: string | null;
  address: string | null;
  area: string | null;
}

interface Docs {
  id: string;
  invoice_url: string | null;
  issue_description: string | null;
  preferred_time: string | null;
  media_urls: string[] | null;
}

const last10 = (p: string) => normalizeMsisdn(p).slice(-10);

function requiredItems(rt: string): string[] {
  return rt === "installation"
    ? ["invoice photo", "door photo", "preferred date & time"]
    : ["problem description", "issue photos", "preferred date & time"];
}

function collectedState(rt: string, d: Docs): Record<string, boolean> {
  if (rt === "installation") {
    return {
      "invoice photo": !!d.invoice_url,
      "door photo": (d.media_urls?.length ?? 0) > 0,
      "preferred date & time": !!d.preferred_time,
    };
  }
  return {
    "problem description": !!d.issue_description,
    "issue photos": (d.media_urls?.length ?? 0) > 0,
    "preferred date & time": !!d.preferred_time,
  };
}

function allCollected(rt: string, d: Docs): boolean {
  return Object.values(collectedState(rt, d)).every(Boolean);
}

async function getDocs(supabase: SupabaseClient, leadId: string): Promise<Docs> {
  const sel = "id, invoice_url, issue_description, preferred_time, media_urls";
  const { data } = await supabase
    .from("customer_docs")
    .select(sel)
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (data) return data as Docs;
  const { data: created } = await supabase
    .from("customer_docs")
    .insert({ lead_id: leadId, media_urls: [] })
    .select(sel)
    .single();
  return created as Docs;
}

async function uploadInbound(
  supabase: SupabaseClient,
  leadId: string,
  media: { bytes: Uint8Array; mime: string }
) {
  const ext = (media.mime.split("/")[1] || "bin").split(";")[0];
  const path = `customer/${leadId}/photo-${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, media.bytes, {
    contentType: media.mime,
  });
  if (error) throw new Error(error.message);
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

interface TurnResult {
  reply: string;
  preferred_datetime: string | null;
  issue_description: string | null;
  customer_confirmed: boolean;
}

/** One LLM-driven turn: Gemini writes the reply and extracts any data. */
async function llmTurn(
  lead: { customer_name: string; request_type: string },
  docs: Docs,
  event: string
): Promise<TurnResult | null> {
  const rt = lead.request_type;
  const items = requiredItems(rt);
  const state = collectedState(rt, docs);
  const stillNeeded = items.filter((i) => !state[i]);

  const system =
    `You are the friendly WhatsApp assistant for MLV Enterprise, an authorised Yale smart-lock service dealer in Chennai. ` +
    `You are chatting with the customer ${lead.customer_name} about their Yale ${rt} request. ` +
    `Collect these items conversationally, ONE at a time: ${items.join(", ")}. ` +
    `The customer sends photos directly here in WhatsApp — never give a link or mention any website/form. ` +
    `Already collected: ${JSON.stringify(state)}. Still needed: ${stillNeeded.join(", ") || "nothing"}. ` +
    `Known details so far — preferred date/time: "${docs.preferred_time ?? "not given yet"}", problem: "${docs.issue_description ?? "n/a"}". ` +
    `Use these exact values when you refer to them; NEVER invent or reformat a date the customer didn't say. ` +
    `Be warm and brief (1-3 short sentences), simple English. Ask for the next missing item. ` +
    `If everything is collected, give a one-line summary and ask the customer to reply YES to confirm the visit. ` +
    `When the customer agrees/confirms, set customer_confirmed to true. ` +
    `Respond ONLY as JSON with keys: reply (string), preferred_datetime (string or null — any date/time the customer mentions), ` +
    `issue_description (string or null — any problem description they give), customer_confirmed (boolean).`;

  const res = await geminiJSON(system, `Customer event: ${event}`);
  if (!res || typeof res.reply !== "string") return null;
  return {
    reply: res.reply,
    preferred_datetime: res.preferred_datetime ?? null,
    issue_description: res.issue_description ?? null,
    customer_confirmed: Boolean(res.customer_confirmed),
  };
}

async function finalizeAndAssign(supabase: SupabaseClient, lead: LeadRow) {
  await supabase.from("leads").update({ chat_state: "done" }).eq("id", lead.id);

  const { data: job } = await supabase
    .from("jobs")
    .select("id")
    .eq("lead_id", lead.id)
    .maybeSingle();
  if (!job) return;

  const { data: zonesData } = await supabase
    .from("zones")
    .select("area, technician:technicians(id, name, status)");
  const zones = (zonesData ?? []) as unknown as ZoneRow[];
  const match = matchZone(`${lead.area ?? ""} ${lead.address ?? ""}`, zones);
  const tech = match?.technician && match.technician.status !== "off" ? match.technician : null;

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
    await notifyOwner(`✅ ${lead.customer_name} shared all details — auto-assigned to ${tech.name}.`);
  } else {
    await supabase.from("jobs").update({ status: "ready_to_assign" }).eq("id", job.id);
    await notifyOwner(`✅ ${lead.customer_name} shared all details — ready to assign.`);
  }
}

/** Start the conversation when a lead is created (LLM writes the greeting). */
export async function startCustomerChat(
  supabase: SupabaseClient,
  lead: { id: string; customer_name: string; phone: string; request_type: string }
): Promise<void> {
  await supabase.from("leads").update({ chat_state: "active" }).eq("id", lead.id);
  const docs = await getDocs(supabase, lead.id);
  const turn = await llmTurn(
    lead,
    docs,
    "The conversation is just starting. Greet the customer warmly by name, say you're MLV Enterprise (Yale service), and ask for the first item."
  );
  const greeting =
    turn?.reply ??
    `Hello ${lead.customer_name}! This is MLV Enterprise (Yale service). To schedule your ${lead.request_type}, please send a photo of your invoice.`;
  try {
    await sendText(lead.phone, greeting);
  } catch {
    // window closed / not verified — chat continues when the customer messages
  }
}

/** Handle one inbound WhatsApp message from a customer. */
export async function handleCustomerMessage(
  supabase: SupabaseClient,
  msg: InboundMessage
): Promise<void> {
  const { data: leads } = await supabase
    .from("leads")
    .select("id, customer_name, phone, request_type, chat_state, address, area")
    .not("chat_state", "is", null)
    .neq("chat_state", "done")
    .order("created_at", { ascending: false });

  const lead = (leads ?? []).find(
    (l) => last10(l.phone as string) === last10(msg.from)
  ) as LeadRow | undefined;
  if (!lead) return; // unknown sender → ignore (protects the other bot)

  let docs = await getDocs(supabase, lead.id);
  let event: string;

  if (msg.type === "image" && msg.mediaId) {
    const media = await downloadMedia(msg.mediaId);
    if (!media) {
      await sendText(lead.phone, "Sorry, I couldn't open that image — please send it again.");
      return;
    }
    const url = await uploadInbound(supabase, lead.id, media);
    const kind = await geminiClassifyImage(url);
    if (lead.request_type === "installation" && kind === "invoice" && !docs.invoice_url) {
      await supabase.from("customer_docs").update({ invoice_url: url }).eq("id", docs.id);
      event = "The customer just sent their INVOICE photo.";
    } else {
      const arr = [...(docs.media_urls ?? []), url];
      await supabase.from("customer_docs").update({ media_urls: arr }).eq("id", docs.id);
      event =
        lead.request_type === "installation"
          ? "The customer just sent a photo of the DOOR."
          : "The customer just sent a photo of the ISSUE.";
    }
    docs = await getDocs(supabase, lead.id);
  } else if (msg.type === "text" && msg.text?.trim()) {
    event = `The customer said: "${msg.text.trim()}"`;
  } else {
    event = "The customer sent a message we couldn't read.";
  }

  const turn = await llmTurn(lead, docs, event);
  if (!turn) {
    await sendText(lead.phone, "Thank you! Please share the next detail when you're ready.");
    return;
  }

  const update: Record<string, string> = {};
  if (turn.preferred_datetime) update.preferred_time = String(turn.preferred_datetime);
  if (turn.issue_description && lead.request_type === "breakdown" && !docs.issue_description) {
    update.issue_description = String(turn.issue_description);
  }
  if (Object.keys(update).length) {
    await supabase.from("customer_docs").update(update).eq("id", docs.id);
    docs = await getDocs(supabase, lead.id);
  }

  await sendText(lead.phone, turn.reply);

  if (turn.customer_confirmed && allCollected(lead.request_type, docs)) {
    await finalizeAndAssign(supabase, lead);
  }
}
