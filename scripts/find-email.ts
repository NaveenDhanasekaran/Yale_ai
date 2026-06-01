// Diagnostic: find any "CALL LOG" mail across folders + list newest arrivals.
// Run: node --env-file=.env.local scripts/find-email.ts
import { ImapFlow } from "imapflow";

const client = new ImapFlow({
  host: "imap.gmail.com",
  port: 993,
  secure: true,
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  logger: false,
});

await client.connect();
try {
  const boxes = await client.list();
  const allMail = boxes.find((b) => b.specialUse === "\\All")?.path;
  const spam = boxes.find((b) => b.specialUse === "\\Junk")?.path;
  console.log("All Mail folder:", allMail, "| Spam folder:", spam);

  const searchBox = async (path?: string) => {
    if (!path) return;
    const lock = await client.getMailboxLock(path);
    try {
      const uids = (await client.search({ subject: "CALL LOG" }, { uid: true })) || [];
      console.log(`\n[${path}] subject contains "CALL LOG": ${uids.length} match(es)`);
      for await (const msg of client.fetch(
        { uid: (uids.slice(-5).join(",")) || "0" },
        { envelope: true, flags: true },
        { uid: true }
      )) {
        console.log(`   "${msg.envelope?.subject}" from ${msg.envelope?.from?.[0]?.address} seen=${msg.flags?.has("\\Seen")}`);
      }
    } finally {
      lock.release();
    }
  };

  await searchBox("INBOX");
  await searchBox(allMail);
  await searchBox(spam);

  // Newest 8 arrivals overall (All Mail = everything except Spam/Trash)
  if (allMail) {
    const lock = await client.getMailboxLock(allMail);
    try {
      const total = (client.mailbox && typeof client.mailbox === "object" ? client.mailbox.exists : 0) as number;
      console.log(`\nNewest arrivals in ${allMail} (total ${total}):`);
      for await (const msg of client.fetch(`${Math.max(1, total - 7)}:*`, { envelope: true, flags: true })) {
        console.log(`   ${msg.envelope?.date?.toISOString?.() ?? "?"} | "${msg.envelope?.subject}" | from ${msg.envelope?.from?.[0]?.address} | to ${msg.envelope?.to?.[0]?.address}`);
      }
    } finally {
      lock.release();
    }
  }
} finally {
  await client.logout();
}
