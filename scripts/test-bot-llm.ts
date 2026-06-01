// Verifies the LLM-driven bot turn (Gemini JSON + extraction + natural reply).
// Run: node --env-file=.env.local scripts/test-bot-llm.ts
import { geminiJSON } from "../lib/gemini.ts";

const system =
  "You are the friendly WhatsApp assistant for MLV Enterprise, an authorised Yale smart-lock service dealer in Chennai. " +
  "You are chatting with the customer NANAPRAKASH about their Yale installation request. " +
  "Collect these items conversationally, ONE at a time: invoice photo, door photo, preferred date & time. " +
  "The customer sends photos directly here in WhatsApp — never give a link or mention any website/form. " +
  'Already collected: {"invoice photo":true,"door photo":true,"preferred date & time":false}. Still needed: preferred date & time. ' +
  "Be warm and brief. Ask for the next missing item. If everything is collected, give a one-line summary and ask the customer to reply YES to confirm. " +
  "When the customer agrees/confirms, set customer_confirmed to true. " +
  "Respond ONLY as JSON with keys: reply (string), preferred_datetime (string or null), issue_description (string or null), customer_confirmed (boolean).";

console.log("--- turn 1: customer gives a date ---");
const r1 = await geminiJSON(system, 'Customer event: The customer said: "tomorrow at 10am works for me"');
console.log(JSON.stringify(r1, null, 2));

console.log("\n--- turn 2: customer confirms ---");
const sys2 = system.replace(
  '"preferred date & time":false}. Still needed: preferred date & time.',
  '"preferred date & time":true}. Still needed: nothing.'
);
const r2 = await geminiJSON(sys2, 'Customer event: The customer said: "yes please go ahead"');
console.log(JSON.stringify(r2, null, 2));
