const GRAPH = "https://graph.facebook.com/v21.0";

export function isWhatsAppConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

/** Normalise to WhatsApp's expected format: digits, country code, no '+'. */
export function normalizeMsisdn(phone: string): string {
  const d = (phone || "").replace(/\D/g, "");
  if (d.length === 10) return "91" + d; // assume India for 10-digit numbers
  return d;
}

async function send(payload: Record<string, unknown>) {
  const id = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_TOKEN;
  const res = await fetch(`${GRAPH}/${id}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || `WhatsApp send failed (HTTP ${res.status})`);
  }
  return data;
}

/** Free-form text — only deliverable within 24h of the recipient's last message. */
export async function sendText(to: string, body: string) {
  return send({
    to: normalizeMsisdn(to),
    type: "text",
    text: { body, preview_url: true },
  });
}

/** Send an image by public URL with an optional caption. */
export async function sendImage(to: string, link: string, caption?: string) {
  return send({
    to: normalizeMsisdn(to),
    type: "image",
    image: { link, caption },
  });
}

/** Template message — required for business-initiated messages (e.g. hello_world). */
export async function sendTemplate(
  to: string,
  name: string,
  language = "en_US",
  components?: unknown[]
) {
  return send({
    to: normalizeMsisdn(to),
    type: "template",
    template: { name, language: { code: language }, components },
  });
}

/** Download an inbound media file (photo/video) the customer sent on WhatsApp. */
export async function downloadMedia(
  mediaId: string
): Promise<{ bytes: Uint8Array; mime: string } | null> {
  const token = process.env.WHATSAPP_TOKEN;
  try {
    const metaRes = await fetch(`${GRAPH}/${mediaId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!metaRes.ok) return null;
    const meta = await metaRes.json();
    if (!meta?.url) return null;
    const fileRes = await fetch(meta.url, { headers: { Authorization: `Bearer ${token}` } });
    if (!fileRes.ok) return null;
    const bytes = new Uint8Array(await fileRes.arrayBuffer());
    return { bytes, mime: meta.mime_type || fileRes.headers.get("content-type") || "application/octet-stream" };
  } catch {
    return null;
  }
}

/** Send the customer their document-collection link (best effort). */
export async function sendCustomerLink(
  phone: string | null,
  name: string,
  token: string | null,
  requestType: string
): Promise<void> {
  if (!isWhatsAppConfigured() || !phone || !token) return;
  const base = process.env.APP_URL || "http://localhost:3000";
  const link = `${base}/c/${token}`;
  const body =
    `Hello ${name}, this is IT Service First (Yale Authorized Dealer) regarding your Yale ${requestType} service request. ` +
    `Please share a few details so we can schedule your visit:\n${link}`;
  try {
    await sendText(phone, body);
  } catch {
    // best effort — e.g. customer number not yet a verified test recipient
  }
}

/** Best-effort owner notification (no-op if not configured). */
export async function notifyOwner(text: string): Promise<void> {
  const owner = process.env.OWNER_WHATSAPP;
  if (!owner || !isWhatsAppConfigured()) return;
  try {
    await sendText(owner, text);
  } catch {
    // best effort — never break the main flow on a notification failure
  }
}
