import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parseYaleCallLog } from "@/lib/yaleEmail";
import { ingestParsedLead } from "@/lib/leadIngest";
import { notifyOwner } from "@/lib/whatsapp";
import { startCustomerChat } from "@/lib/customerBot";

export function isGmailConfigured(): boolean {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

export interface PollSummary {
  processed: number;
  created: number;
  skipped: number;
}

/**
 * Connect to the Gmail inbox over IMAP, find unseen messages from Yale,
 * parse each call-log, create a lead+job (deduped), and mark it seen.
 * One connection per run; safe to call from a cron route or manually.
 */
export async function runYaleInboxPoll(supabase: SupabaseClient): Promise<PollSummary> {
  // Match Yale call-log emails by subject within a recent window, regardless of
  // read/unread state (the owner may open an email before the cron runs).
  // De-dup by Yale ticket id keeps re-reads from creating duplicate leads.
  const subjectFilter = process.env.YALE_SUBJECT || "CALL LOG";
  const fromFilter = process.env.YALE_FROM;
  const sinceDays = Number(process.env.YALE_SINCE_DAYS || 7);
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);

  const client = new ImapFlow({
    host: process.env.GMAIL_HOST || "imap.gmail.com",
    port: 993,
    secure: true,
    auth: {
      user: process.env.GMAIL_USER as string,
      pass: process.env.GMAIL_APP_PASSWORD as string,
    },
    logger: false,
  });

  let processed = 0;
  let created = 0;
  let skipped = 0;

  await client.connect();
  try {
    const lock = await client.getMailboxLock("INBOX");
    try {
      const criteria: { subject: string; since: Date; from?: string } = {
        subject: subjectFilter,
        since,
      };
      if (fromFilter) criteria.from = fromFilter;
      const uids = (await client.search(criteria, { uid: true })) || [];

      for (const uid of uids) {
        const msg = await client.fetchOne(String(uid), { source: true }, { uid: true });
        if (!msg || !msg.source) continue;
        processed++;

        const mail = await simpleParser(msg.source);
        const body = mail.html || mail.text || "";
        const parsed = parseYaleCallLog(body);

        if (!parsed.customer_name || !parsed.phone) {
          skipped++;
          continue;
        }

        // ingestParsedLead de-dups by Yale ticket id, so re-reading a message
        // (even one already processed) never creates a duplicate lead.
        const result = await ingestParsedLead(supabase, parsed, body, "email");
        if (result.created) {
          created++;
          await notifyOwner(
            `🔔 New Yale lead: ${parsed.customer_name} — ${parsed.request_type}` +
              `${parsed.area || parsed.city ? ` (${parsed.area ?? parsed.city})` : ""}. Ref ${parsed.yale_ref_no ?? "—"}.`
          );
          await startCustomerChat(supabase, {
            id: result.leadId,
            customer_name: parsed.customer_name ?? "there",
            phone: parsed.phone ?? "",
            request_type: parsed.request_type,
          });
          await notifyOwner(`📨 Started WhatsApp chat with ${parsed.customer_name ?? "customer"} for details.`);
        } else skipped++;
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }

  return { processed, created, skipped };
}
