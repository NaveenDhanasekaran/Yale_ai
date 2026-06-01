// Verifies the OCR pipeline (storage image -> Gemini vision -> serial parse).
// Run: node --env-file=.env.local scripts/test-ocr.ts
import { createClient } from "@supabase/supabase-js";
import { geminiReadSerial } from "../lib/gemini.ts";

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const b64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const path = `__test__/ocr-${crypto.randomUUID()}.png`;
await s.storage.from("job-docs").upload(path, new Uint8Array(Buffer.from(b64, "base64")), {
  contentType: "image/png",
});
const url = s.storage.from("job-docs").getPublicUrl(path).data.publicUrl;

const serial = await geminiReadSerial(url);
console.log("OCR result for blank image:", serial);

await s.storage.from("job-docs").remove([path]);
console.log(
  serial === null
    ? "OCR pipeline OK ✓ (correctly found no serial in a blank image)"
    : `OCR pipeline ran; returned: ${serial}`
);
