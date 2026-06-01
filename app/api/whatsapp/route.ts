import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { handleCustomerMessage, type InboundMessage } from "@/lib/customerBot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Webhook verification — Meta calls this once when you set the Callback URL.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge ?? "", { status: 200 });
  }
  return new Response("forbidden", { status: 403 });
}

// Incoming customer messages → drive the WhatsApp chat bot.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const supabase = getServiceClient();
  if (!supabase || !body) return NextResponse.json({ ok: true });

  try {
    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const messages = change.value?.messages ?? [];
        for (const m of messages) {
          const msg: InboundMessage = {
            from: m.from,
            type:
              m.type === "text" ? "text" : m.type === "image" ? "image" : m.type === "video" ? "video" : "other",
            text: m.text?.body,
            mediaId: m.image?.id ?? m.video?.id,
            mime: m.image?.mime_type ?? m.video?.mime_type,
          };
          // Videos are treated like images for the "photos" step.
          if (msg.type === "video") msg.type = "image";
          await handleCustomerMessage(supabase, msg);
        }
      }
    }
  } catch (err) {
    console.error("WhatsApp inbound error:", err);
  }

  // Always 200 so Meta doesn't retry-storm.
  return NextResponse.json({ ok: true });
}
