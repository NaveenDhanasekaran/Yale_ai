// Confirms the completion-report email path delivers. Run:
//   node --env-file=.env.local scripts/test-report-email.ts
import { sendMail } from "../lib/email.ts";

const to = process.env.YALE_REPORT_TO || process.env.SMTP_EMAIL;
const info = await sendMail({
  to: to as string,
  subject: "Service Completion — TEST (YLS300526125)",
  html: `<div style="font-family:Arial"><h2>Yale Service Completion Report</h2>
    <p>This is a delivery test of the completion report.</p>
    <p>Serial No: <b>YBL-TEST-12345</b> · Technician: <b>Technician A</b> · Status: CLOSED</p></div>`,
});
console.log(`report email sent to ${to}:`, info.messageId);
