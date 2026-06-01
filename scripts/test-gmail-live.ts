// LIVE test: send a CALL LOG email to the inbox, then read+ingest it via IMAP.
// Run: node --env-file=.env.local scripts/test-gmail-live.ts
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import nodemailer from "nodemailer";
import { parseYaleCallLog } from "../lib/yaleEmail.ts";
import { ingestParsedLead } from "../lib/leadIngest.ts";

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const user = process.env.GMAIL_USER;
const pass = process.env.GMAIL_APP_PASSWORD;
const raw = readFileSync(new URL("./sample-calllog.txt", import.meta.url), "utf8");
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// 1. send a CALL LOG email to ourselves
const tx = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: { user: process.env.SMTP_EMAIL, pass: process.env.SMTP_PASSWORD },
});
await tx.sendMail({
  from: process.env.SMTP_EMAIL,
  to: user,
  subject: "CALL LOG 30/05/2026 (watcher test)",
  text: raw,
});
console.log("sent test email ->", user);

// 2. poll IMAP until it arrives, then parse + ingest
async function pollOnce() {
  const client = new ImapFlow({
    host: process.env.GMAIL_HOST || "imap.gmail.com",
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false,
  });
  let processed = 0;
  let created = 0;
  await client.connect();
  try {
    const lock = await client.getMailboxLock("INBOX");
    try {
      const uids = (await client.search({ seen: false, subject: "CALL LOG" }, { uid: true })) || [];
      for (const uid of uids) {
        const msg = await client.fetchOne(String(uid), { source: true }, { uid: true });
        if (!msg || !msg.source) continue;
        processed++;
        const mail = await simpleParser(msg.source);
        const body = mail.html || mail.text || "";
        const parsed = parseYaleCallLog(body);
        if (parsed.customer_name && parsed.phone) {
          const r = await ingestParsedLead(s, parsed, body, "email");
          if (r.created) created++;
        }
        await client.messageFlagsAdd({ uid: String(uid) }, ["\\Seen"], { uid: true });
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
  return { processed, created };
}

let res = { processed: 0, created: 0 };
for (let i = 0; i < 8; i++) {
  await delay(4000);
  res = await pollOnce();
  console.log(`poll ${i + 1}: processed=${res.processed} created=${res.created}`);
  if (res.processed > 0) break;
}

const { data: lead } = await s
  .from("leads")
  .select("customer_name, yale_ref_no, request_type, source")
  .eq("yale_ref_no", "YLS300526125")
  .maybeSingle();
console.log("lead in DB:", JSON.stringify(lead));

await s.from("leads").delete().eq("yale_ref_no", "YLS300526125");
console.log(lead ? "Gmail watcher LIVE OK (cleaned up)" : "No lead created — check above.");
