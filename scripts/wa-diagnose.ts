// Discovers the WhatsApp assets the token can actually access. Run:
//   node --env-file=.env.local scripts/wa-diagnose.ts
const token = process.env.WHATSAPP_TOKEN;

async function get(path: string) {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`https://graph.facebook.com/v21.0/${path}${sep}access_token=${token}`);
  return (await res.json().catch(() => ({}))) as any;
}

async function main() {
  const dbg = await get(`debug_token?input_token=${token}`);
  const d = dbg?.data ?? {};
  console.log("app_id:", d.app_id, "| type:", d.type, "| expires:", d.expires_at);
  console.log("scopes:", JSON.stringify(d.scopes));
  const gs = d.granular_scopes ?? [];
  console.log("granular_scopes:", JSON.stringify(gs));

  const waScope = gs.find((s: any) => String(s.scope || "").includes("whatsapp"));
  const wabaId = waScope?.target_ids?.[0];
  console.log("\ndiscovered WABA id:", wabaId ?? "(none — token has no WhatsApp scope)");

  if (wabaId) {
    const pn = await get(`${wabaId}/phone_numbers`);
    console.log("phone_numbers:", JSON.stringify(pn));
  }
}

main();
