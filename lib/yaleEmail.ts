import type { RequestType } from "@/lib/types";

/** Fields extracted from a Yale "CALL LOG" email, mapped to lead columns. */
export interface ParsedYaleLead {
  yale_ref_no: string | null;
  branch: string | null;
  registration_date: string | null; // ISO yyyy-mm-dd
  request_type: RequestType;
  customer_type: string | null;
  phone: string | null;
  caller_number: string | null;
  customer_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  area: string | null;
  brand: string | null;
  product_group: string | null;
  model: string | null;
  product_details: string | null;
  dop: string | null; // ISO yyyy-mm-dd
  dealer_name: string | null;
  customer_remarks: string | null;
  call_logged_by: string | null;
}

// Every header label that appears in the call-log table. We need the full
// set so the parser knows where one field's value ends and the next begins.
const LABELS: string[] = [
  "BRANCH", "BRAND TICKET ID", "REGISTRATION DATE", "CALL TYPE",
  "SERVICE CENTER", "CUSTOMER TYPE", "CUSTOMER MOBILE", "CALLER NUMBER",
  "CUSTOMER NAME", "POSTAL ADDRESS", "CITY NAME", "STATE NAME", "BRAND",
  "GROUP", "MODEL", "SERIAL NO", "DOP", "PURCHASE CHANNEL", "DEALER NAME",
  "LOCATION", "PURCHASE DATE (PO NUMBER)", "PART REQUESTED 1",
  "PART REQUESTED 2", "CONSUMED PARTS", "UNUSED PARTS", "WARRANTY STATUS",
  "WARRANTY START AT", "WARRANTY END AT", "JOB CLOSE DATE", "JOB CLOSE MONTH",
  "TECHNICIAN REMARKS", "TICKET STATUS", "TECHNICIAN", "REQUESTED DISCOUNT",
  "TICKET CHARGE", "TA/DA", "SERVICE AMOUNT", "ACTUAL SERVICE AMOUNT",
  "SPARE AMOUNT", "ASC PRICE", "ASC REMARK", "APPROVED DISCOUNT",
  "DISCOUNT APPROVED BY", "TAT IN DAYS", "SKILL LEVEL", "DAY ZERO CHARGE",
  "DAY ONE CHARGE", "REQUEST CHARGE", "MANAGER'S REMARK", "HAPPY CODE",
  "HAPPY CODE PAYOUT", "CUSTOMER REMARKS", "CALL LOGGED BY",
];

const LABEL_SET = new Set(LABELS);
const ROLE_TOKENS = new Set(["CC", "RM", "ASP"]);
const HEADER_ROW_TOKENS = new Set(["DATA TO BE FILLED BY", "HEADER", "DATA"]);

function htmlToText(html: string): string {
  return html
    .replace(/<\s*(br|\/td|\/th|\/tr|\/p|\/div|\/h[1-6])\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"');
}

// Turn the email (HTML or plain text, separate-line or tab-separated rows)
// into a flat list of tokens, dropping role markers and the header row.
function tokenize(content: string): string[] {
  const looksHtml = /<\/?[a-z][^>]*>/i.test(content);
  const text = looksHtml ? htmlToText(content) : content;
  const tokens: string[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    for (const piece of rawLine.split("\t")) {
      const t = piece.trim();
      if (!t) continue;
      const up = t.toUpperCase();
      if (ROLE_TOKENS.has(up) || HEADER_ROW_TOKENS.has(up)) continue;
      tokens.push(t);
    }
  }
  return tokens;
}

function extractFields(content: string): Record<string, string> {
  const tokens = tokenize(content);
  const fields: Record<string, string> = {};
  for (let i = 0; i < tokens.length; i++) {
    const up = tokens[i].toUpperCase();
    if (!LABEL_SET.has(up)) continue;
    const next = tokens[i + 1];
    fields[up] = next && !LABEL_SET.has(next.toUpperCase()) ? next : "";
  }
  return fields;
}

function clean(v: string | undefined): string | null {
  const t = (v ?? "").trim();
  return t.length ? t : null;
}

/** Parse DD-MM-YYYY or DD/MM/YY into ISO yyyy-mm-dd. */
function parseDmy(v: string | undefined): string | null {
  const m = (v ?? "").trim().match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (!m) return null;
  const dd = m[1].padStart(2, "0");
  const mm = m[2].padStart(2, "0");
  const yyyy = m[3].length === 2 ? "20" + m[3] : m[3];
  if (Number(mm) < 1 || Number(mm) > 12 || Number(dd) < 1 || Number(dd) > 31) return null;
  return `${yyyy}-${mm}-${dd}`;
}

export function parseYaleCallLog(content: string): ParsedYaleLead {
  const f = extractFields(content);

  const request_type: RequestType = (f["CALL TYPE"] ?? "")
    .toLowerCase()
    .includes("install")
    ? "installation"
    : "breakdown";

  const address = clean(f["POSTAL ADDRESS"]);
  const pincode = address?.match(/\b(\d{6})\b/)?.[1] ?? null;

  const brand = clean(f["BRAND"]);
  const product_group = clean(f["GROUP"]);
  const model = clean(f["MODEL"]);
  const product_details =
    [brand, product_group, model].filter(Boolean).join(" · ") || null;

  return {
    yale_ref_no: clean(f["BRAND TICKET ID"]),
    branch: clean(f["BRANCH"]),
    registration_date: parseDmy(f["REGISTRATION DATE"]),
    request_type,
    customer_type: clean(f["CUSTOMER TYPE"]),
    phone: clean(f["CUSTOMER MOBILE"]),
    caller_number: clean(f["CALLER NUMBER"]),
    customer_name: clean(f["CUSTOMER NAME"]),
    address,
    city: clean(f["CITY NAME"]),
    state: clean(f["STATE NAME"]),
    pincode,
    area: null, // matched against the zones table at assignment time
    brand,
    product_group,
    model,
    product_details,
    dop: parseDmy(f["DOP"]),
    dealer_name: clean(f["DEALER NAME"]),
    customer_remarks: clean(f["CUSTOMER REMARKS"]),
    call_logged_by: clean(f["CALL LOGGED BY"]),
  };
}
