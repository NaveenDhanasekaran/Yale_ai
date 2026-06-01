const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

async function generateContent(
  contents: unknown[],
  system?: string,
  generationConfig?: Record<string, unknown>
): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;
  const body: Record<string, unknown> = { contents };
  if (system) body.systemInstruction = { parts: [{ text: system }] };
  if (generationConfig) body.generationConfig = generationConfig;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || `Gemini request failed (HTTP ${res.status})`);
  }
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  return parts.map((p: { text?: string }) => p.text ?? "").join("").trim();
}

/** Read a product serial number from an image (OCR via Gemini vision). */
export async function geminiReadSerial(imageUrl: string): Promise<string | null> {
  if (!isGeminiConfigured()) return null;
  try {
    const img = await fetch(imageUrl);
    if (!img.ok) return null;
    const b64 = Buffer.from(await img.arrayBuffer()).toString("base64");
    const mime = img.headers.get("content-type") || "image/jpeg";

    const text = await generateContent([
      {
        role: "user",
        parts: [
          {
            text:
              "This is a photo of a product label/sticker. Extract the SERIAL NUMBER only. " +
              "Reply with ONLY the serial number characters — no labels, no extra words. " +
              "If there is no serial number visible, reply exactly: NONE",
          },
          { inline_data: { mime_type: mime, data: b64 } },
        ],
      },
    ]);

    const s = text.trim();
    return !s || /^none$/i.test(s) ? null : s;
  } catch {
    return null;
  }
}

/** Ask Gemini for a JSON object (LLM-driven bot turn). Returns parsed object or null. */
export async function geminiJSON(system: string, userText: string): Promise<any | null> {
  if (!isGeminiConfigured()) return null;
  try {
    const text = await generateContent(
      [{ role: "user", parts: [{ text: userText }] }],
      system,
      { responseMimeType: "application/json", temperature: 0.4 }
    );
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Classify a photo into one of: invoice, door, issue, product, serial, other. */
export async function geminiClassifyImage(imageUrl: string): Promise<string> {
  if (!isGeminiConfigured()) return "other";
  try {
    const img = await fetch(imageUrl);
    if (!img.ok) return "other";
    const b64 = Buffer.from(await img.arrayBuffer()).toString("base64");
    const mime = img.headers.get("content-type") || "image/jpeg";
    const text = await generateContent([
      {
        role: "user",
        parts: [
          {
            text:
              "Classify this photo into exactly ONE word from this list: invoice, door, issue, product, serial, other. Reply with only the single word.",
          },
          { inline_data: { mime_type: mime, data: b64 } },
        ],
      },
    ]);
    const w = text.trim().toLowerCase().split(/\s+/)[0];
    return ["invoice", "door", "issue", "product", "serial", "other"].includes(w) ? w : "other";
  } catch {
    return "other";
  }
}

export interface ChatMsg {
  role: "user" | "model";
  text: string;
}

/** Conversational reply for the customer bot. */
export async function geminiChatReply(system: string, history: ChatMsg[]): Promise<string> {
  if (!isGeminiConfigured()) return "";
  const contents = history.map((m) => ({ role: m.role, parts: [{ text: m.text }] }));
  return generateContent(contents, system);
}
