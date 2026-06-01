// Manually polls the inbox for recent CALL LOG emails (read or unread),
// ingests them (dedup by ticket id), and leaves the leads in the DB.
// Run: node --env-file=.env.local scripts/poll-inbox.ts
import { createClient } from "@supabase/supabase-js";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { parseYaleCallLog } from "../lib/yaleEmail.ts";
import { ingestParsedLead } from "../lib/leadIngest.ts";

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
const client = new ImapFlow({
  host: "imap.gmail.com",
  port: 993,
  secure: true,
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  logger: false,
});

await client.connect();
try {
  const lock = await client.getMailboxLock("INBOX");
  try {
    const uids = (await client.search({ subject: "CALL LOG", since }, { uid: true })) || [];
    console.log(`CALL LOG emails in last 7 days: ${uids.length}`);

    let created = 0;
    for (const uid of uids) {
      const msg = await client.fetchOne(String(uid), { source: true }, { uid: true });
      if (!msg || !msg.source) continue;
      const mail = await simpleParser(msg.source);
      const body = mail.html || mail.text || "";
      const parsed = parseYaleCallLog(body);
      console.log(`  "${mail.subject}" -> name=${parsed.customer_name} phone=${parsed.phone} ref=${parsed.yale_ref_no}`);
      if (parsed.customer_name && parsed.phone) {
        const r = await ingestParsedLead(s, parsed, body, "email");
        if (r.created) created++;
        console.log(`     ${r.created ? "CREATED lead" : "already exists (dedup)"}`);
      }
    }
    console.log(`\nCreated ${created} new lead(s).`);
  } finally {
    lock.release();
  }
} finally {
  await client.logout();
}

const { data: leads } = await s
  .from("leads")
  .select("customer_name, yale_ref_no, source, request_type, area")
  .order("created_at", { ascending: false });
console.log("Leads now in DB:", JSON.stringify(leads, null, 2));
