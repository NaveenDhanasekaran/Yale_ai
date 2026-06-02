import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { geminiChatReply, isGeminiConfigured, type ChatMsg } from "@/lib/gemini";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isGeminiConfigured()) {
    return NextResponse.json({ reply: "" });
  }

  const { token, messages } = await req.json().catch(() => ({ token: "", messages: [] }));

  let name = "there";
  let requestType = "service";
  const supabase = getServiceClient();
  if (supabase && token) {
    const { data: lead } = await supabase
      .from("leads")
      .select("customer_name, request_type")
      .eq("customer_token", String(token))
      .maybeSingle();
    if (lead) {
      name = lead.customer_name as string;
      requestType = lead.request_type as string;
    }
  }

  const need =
    requestType === "installation"
      ? "the invoice copy and a clear photo of the door"
      : "a short description of the problem and photos/videos of the issue";

  const system =
    `You are a warm, polite assistant for IT Service First, an authorised Yale smart-lock service dealer in Chennai. ` +
    `You are chatting with the customer ${name} about their Yale ${requestType} request. ` +
    `Help them and answer their questions in simple, friendly English. ` +
    `We need them to: upload ${need}, choose a preferred date and time, and (optionally) share their location — ` +
    `all using the form on this same page. Do NOT ask them to send files in the chat; guide them to the upload buttons below. ` +
    `Keep every reply to 1-3 short sentences.`;

  const history: ChatMsg[] = Array.isArray(messages) ? messages.slice(-12) : [];

  try {
    const reply = await geminiChatReply(system, history);
    return NextResponse.json({ reply: reply || "How can I help you?" });
  } catch {
    return NextResponse.json({
      reply: "Sorry, I'm having trouble right now — please fill the form below and we'll take care of it.",
    });
  }
}
