const token = process.env.WHATSAPP_TOKEN;
const waba = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID; // MLV WABA 835670515703605
const get = async (p) => {
  const sep = p.includes("?") ? "&" : "?";
  const r = await fetch(`https://graph.facebook.com/v21.0/${p}${sep}access_token=${token}`);
  return { status: r.status, data: await r.json().catch(() => ({})) };
};

// Which apps currently receive this WABA's incoming messages (webhooks)?
console.log("subscribed_apps for MLV WABA:", JSON.stringify(await get(`${waba}/subscribed_apps`), null, 2));
