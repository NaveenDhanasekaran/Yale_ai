import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { isGmailConfigured, runYaleInboxPoll } from "@/lib/gmail";

// IMAP needs the Node.js runtime (TCP sockets), not Edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // no secret set (e.g. local dev) → allow
  // Vercel Cron sends "Authorization: Bearer <CRON_SECRET>".
  if (req.headers.get("authorization") === `Bearer ${secret}`) return true;
  // Allow manual browser testing with ?secret=...
  const url = new URL(req.url);
  return url.searchParams.get("secret") === secret;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isGmailConfigured()) {
    return NextResponse.json(
      { error: "Gmail not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD." },
      { status: 503 }
    );
  }
  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 503 });
  }

  try {
    const summary = await runYaleInboxPoll(supabase);
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "poll failed" },
      { status: 500 }
    );
  }
}
