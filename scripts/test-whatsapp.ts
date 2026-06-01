// Sends a WhatsApp test message. Run:
//   $env:TO="<your-whatsapp-number>"; node --env-file=.env.local scripts/test-whatsapp.ts
//   (bash:  TO="<num>" node --env-file=.env.local scripts/test-whatsapp.ts )
import { sendTemplate, sendText, normalizeMsisdn } from "../lib/whatsapp.ts";

const to = process.env.TO;
if (!to) {
  console.error("Set TO=<recipient whatsapp number> (must be a verified test recipient).");
  process.exit(1);
}
console.log("Sending to:", normalizeMsisdn(to));

try {
  const r = await sendTemplate(to, "hello_world", "en_US");
  console.log("hello_world template sent ✓", JSON.stringify(r?.messages ?? r));
} catch (e) {
  console.error("template FAILED:", e instanceof Error ? e.message : e);
}

try {
  const r = await sendText(to, "✅ Yale Service — WhatsApp is connected.");
  console.log("free-form text sent ✓", JSON.stringify(r?.messages ?? r));
} catch (e) {
  console.error("free-form text failed (normal if outside 24h window):", e instanceof Error ? e.message : e);
}
