import nodemailer from "nodemailer";

export function isSmtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST && process.env.SMTP_EMAIL && process.env.SMTP_PASSWORD
  );
}

function getTransport() {
  const port = Number(process.env.SMTP_PORT || 587);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465, // 465 = implicit TLS; 587 = STARTTLS
    auth: { user: process.env.SMTP_EMAIL, pass: process.env.SMTP_PASSWORD },
  });
}

export interface MailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export async function sendMail(opts: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  attachments?: MailAttachment[];
}) {
  const transport = getTransport();
  return transport.sendMail({
    from: process.env.SMTP_EMAIL,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
    attachments: opts.attachments,
  });
}
