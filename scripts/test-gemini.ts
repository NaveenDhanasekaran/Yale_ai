// Verifies the Gemini API key + model. Run:
//   node --env-file=.env.local scripts/test-gemini.ts
import { geminiChatReply, isGeminiConfigured } from "../lib/gemini.ts";

if (!isGeminiConfigured()) {
  console.error("GEMINI_API_KEY not set");
  process.exit(1);
}

const reply = await geminiChatReply(
  "You are a helpful assistant for MLV Enterprise, a Yale lock service dealer. Keep replies to one short sentence.",
  [{ role: "user", text: "Say hello and confirm you are working." }]
);
console.log("Gemini reply:", reply || "(empty)");
console.log(reply ? "Gemini OK ✓" : "Gemini returned nothing — check model/key.");
