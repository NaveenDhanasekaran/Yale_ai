// Lists all phone numbers under both WhatsApp Business Accounts the token can see.
// Run: node --env-file=.env.local scripts/wa-numbers.ts
const token = process.env.WHATSAPP_TOKEN;

async function get(path: string) {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`https://graph.facebook.com/v21.0/${path}${sep}access_token=${token}`);
  return (await res.json().catch(() => ({}))) as any;
}

async function main() {
  for (const waba of ["835670515703605", "829855456834897"]) {
    const pn = await get(`${waba}/phone_numbers`);
    console.log(`\nWABA ${waba}:`);
    const list = pn?.data ?? [];
    if (!list.length) {
      console.log("  (no numbers / no access)", JSON.stringify(pn?.error ?? {}));
    }
    for (const n of list) {
      console.log(`  id=${n.id} | ${n.display_phone_number} | "${n.verified_name}" | verify=${n.code_verification_status} | platform=${n.platform_type}`);
    }
  }
}

main();
