import pg from "pg";
const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
const { rows } = await c.query(
  "select net.http_get(url := 'https://yaleit.vercel.app/api/poll-email?secret=yale-local-test-secret-9182') as id"
);
const id = rows[0].id;
console.log("triggered request id:", id);
await new Promise((r) => setTimeout(r, 5000));
const res = await c.query(
  "select status_code, left(content::text, 200) as body from net._http_response where id = $1",
  [id]
);
console.log("response:", JSON.stringify(res.rows));
await c.end();
