// Maps all businesses + WhatsApp accounts + numbers the token can reach.
// Run: node --env-file=.env.local scripts/wa-assets.ts
const token = process.env.WHATSAPP_TOKEN;

async function get(path: string) {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`https://graph.facebook.com/v21.0/${path}${sep}access_token=${token}`);
  return (await res.json().catch(() => ({}))) as any;
}

async function main() {
  const biz = await get("me/businesses?fields=id,name");
  console.log("businesses:", JSON.stringify(biz?.data ?? biz));

  for (const b of biz?.data ?? []) {
    const owned = await get(`${b.id}/owned_whatsapp_business_accounts?fields=id,name`);
    console.log(`\nbusiness ${b.id} "${b.name}" owned WABAs:`, JSON.stringify(owned?.data ?? owned?.error));
    for (const w of owned?.data ?? []) {
      const pn = await get(`${w.id}/phone_numbers?fields=id,display_phone_number,verified_name`);
      console.log(`   WABA ${w.id} numbers:`, JSON.stringify(pn?.data ?? pn?.error));
    }
  }

  console.log("\ndirect check test WABA 1447120700236039:", JSON.stringify(await get("1447120700236039?fields=id,name")));
}

main();
